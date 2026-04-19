import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlaceOrderDto, UpdateOrderStatusDto, AddShipmentDto, AdminOrderQueryDto } from './dto/order.dto';
import { DiscountsService } from '../discounts/discounts.service';
import { Prisma } from '@prisma/client';

const ORDER_INCLUDE = {
  items: {
    include: {
      variant: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  },
  address: true,
  coupon: { select: { id: true, code: true, discountType: true, discountValue: true } },
  shipment: true,
  statusHistory: { orderBy: { changedAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

function generateOrderNumber(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `BV-${ymd}-${rand}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private discountsService: DiscountsService,
  ) {}

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyOrder(userId: string, orderNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { userId, orderNumber },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException(`Order ${orderNumber} not found`);
    return order;
  }

  async placeOrder(userId: string, dto: PlaceOrderDto) {
    // 1. Load variants
    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true },
      include: {
        product: { select: { id: true, name: true, priceInr: true } },
      },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more items are unavailable');
    }

    // 2. Validate stock & build line items
    const lineItems: {
      productId: string;
      variantId: string;
      quantity: number;
      unitPrice: number;
      snapshotName: string;
    }[] = [];
    let subtotal = 0;

    for (const reqItem of dto.items) {
      const v = variants.find((x) => x.id === reqItem.variantId)!;
      const available = v.stockQty - v.reservedQty;
      if (available < reqItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for size ${v.size} (${available} available)`,
        );
      }
      const unitPrice =
        v.priceOverrideInr != null ? Number(v.priceOverrideInr) : Number(v.product.priceInr);
      const lineTotal = unitPrice * reqItem.quantity;
      subtotal += lineTotal;
      lineItems.push({
        productId: v.productId,
        variantId: v.id,
        quantity: reqItem.quantity,
        unitPrice,
        snapshotName: `${v.product.name} — ${v.size}`,
      });
    }

    // 3. Validate address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId, deletedAt: null },
    });
    if (!address) throw new BadRequestException('Invalid or inaccessible address');

    // 4. Validate coupon
    let discountAmount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const result = await this.discountsService.validate(userId, {
        code: dto.couponCode,
        orderTotal: subtotal,
      });
      discountAmount = result.discountAmount;
      couponId = result.discountCodeId;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    // 5. Atomic transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Reserve stock
      for (const item of dto.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { reservedQty: { increment: item.quantity } },
        });
      }

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId: dto.addressId,
          currency: dto.currency ?? 'INR',
          subtotal,
          discountAmount,
          shippingCharge: 0,
          taxAmount: 0,
          totalAmount,
          itemCount: lineItems.reduce((sum, i) => sum + i.quantity, 0),
          couponId,
          notes: dto.notes,
          orderStatus: 'placed',
          paymentStatus: 'pending',
          items: { create: lineItems },
          statusHistory: {
            create: { toStatus: 'placed', changedBy: userId, note: 'Order placed by customer' },
          },
        },
        include: ORDER_INCLUDE,
      });

      // Record coupon usage
      if (couponId) {
        await tx.couponUsage.create({
          data: {
            couponId,
            userId,
            orderId: order.id,
            discountApplied: discountAmount,
          },
        });
        await tx.discountCode.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return order;
    });

    // Email & WhatsApp are sent by PaymentsService after payment is verified
    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['placed', 'confirmed'].includes(order.orderStatus)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { reservedQty: { decrement: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: 'cancelled',
          statusHistory: {
            create: { toStatus: 'cancelled', changedBy: userId, note: 'Cancelled by customer' },
          },
        },
        include: ORDER_INCLUDE,
      });
    });
  }

  async getAllOrders(query: AdminOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(query.status && { orderStatus: query.status }),
      ...(query.search && {
        OR: [
          { orderNumber: { contains: query.search, mode: 'insensitive' } },
          { user: { email: { contains: query.search, mode: 'insensitive' } } },
          { user: { phone: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          ...ORDER_INCLUDE,
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(orderId: string, changedById: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      // On confirmation: deduct stock and release reservations
      if (dto.status === 'confirmed' && order.orderStatus === 'placed') {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockQty: { decrement: item.quantity },
              reservedQty: { decrement: item.quantity },
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: dto.status,
          statusHistory: {
            create: { toStatus: dto.status, changedBy: changedById, note: dto.note },
          },
        },
        include: ORDER_INCLUDE,
      });
    });
  }

  async getShipment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order.shipment;
  }

  async addShipment(orderId: string, dto: AddShipmentDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.shipment.create({
      data: {
        orderId,
        logisticsProvider: dto.carrier,
        awbNumber: dto.awbNumber,
        trackingUrl: dto.trackingUrl,
        status: 'pickup_pending',
      },
    });
  }
}
