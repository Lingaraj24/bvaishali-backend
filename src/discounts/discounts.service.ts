import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto, UpdateDiscountDto, ValidateCouponDto } from './dto/discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    });
  }

  async create(createdBy: string, dto: CreateDiscountDto) {
    const existing = await this.prisma.discountCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) throw new ConflictException(`Code '${dto.code}' already exists`);

    return this.prisma.discountCode.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? 0,
        maxDiscountCap: dto.maxDiscountCap,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit ?? 1,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateDiscountDto) {
    await this.findById(id);
    return this.prisma.discountCode.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        usageLimit: dto.usageLimit,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.discountCode.delete({ where: { id } });
  }

  async validate(userId: string, dto: ValidateCouponDto) {
    const code = dto.code.toUpperCase();
    const discount = await this.prisma.discountCode.findUnique({ where: { code } });

    if (!discount || !discount.isActive) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }
    const now = new Date();
    if (discount.validUntil && discount.validUntil < now) {
      throw new BadRequestException('Coupon has expired');
    }
    if (discount.validFrom > now) {
      throw new BadRequestException('Coupon is not yet active');
    }
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (Number(discount.minOrderValue) > 0 && dto.orderTotal < Number(discount.minOrderValue)) {
      throw new BadRequestException(
        `Minimum order value for this coupon is ₹${discount.minOrderValue}`,
      );
    }

    // Per-user usage check
    const userUsages = await this.prisma.couponUsage.count({
      where: { couponId: discount.id, userId },
    });
    if (userUsages >= discount.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    // Calculate discount
    let discountAmount = 0;
    if (discount.discountType === 'flat') {
      discountAmount = Number(discount.discountValue);
    } else if (discount.discountType === 'percent') {
      discountAmount = (dto.orderTotal * Number(discount.discountValue)) / 100;
      if (discount.maxDiscountCap) {
        discountAmount = Math.min(discountAmount, Number(discount.maxDiscountCap));
      }
    }
    discountAmount = Math.min(Math.round(discountAmount), dto.orderTotal);

    return {
      valid: true,
      code,
      discountType: discount.discountType,
      discountAmount,
      discountCodeId: discount.id,
    };
  }

  private async findById(id: string) {
    const d = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!d) throw new NotFoundException(`Discount code ${id} not found`);
    return d;
  }
}
