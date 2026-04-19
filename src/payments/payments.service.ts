import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateRazorpayOrderDto, VerifyPaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay | null;
  private readonly keySecret: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', '');
    if (keyId) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: this.keySecret });
    } else {
      this.razorpay = null;
      this.logger.warn('RAZORPAY_KEY_ID not set — payments disabled');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Step 1: Frontend calls this to get a Razorpay order_id
  //         before opening the Razorpay checkout modal
  // ─────────────────────────────────────────────────────────
  async createRazorpayOrder(userId: string, dto: CreateRazorpayOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }

    if (!this.razorpay) throw new BadRequestException('Payments not configured on this server');

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    const rzpOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: order.currency,
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    });

    // Persist the Razorpay order ID so we can verify it later
    await this.prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      currency: order.currency,
      orderNumber: order.orderNumber,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Step 2: Frontend calls this after Razorpay modal succeeds
  //         Verifies HMAC signature → marks paid → sends notifications
  // ─────────────────────────────────────────────────────────
  async verifyAndConfirm(userId: string, dto: VerifyPaymentDto) {
    // 1. Verify HMAC signature
    const expectedSignature = createHmac('sha256', this.keySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      this.logger.warn(
        `Signature mismatch for order ${dto.orderId} — possible tamper attempt`,
      );
      throw new BadRequestException('Payment verification failed — invalid signature');
    }

    // 2. Load our order
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, size: true, stockQty: true, reservedQty: true } },
          },
        },
        address: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'paid') {
      // Idempotent — already processed (e.g. webhook arrived first)
      return { success: true, orderNumber: order.orderNumber };
    }

    // 3. Atomic update: mark paid, deduct stock, release reservation, record history
    await this.prisma.$transaction(async (tx) => {
      // Deduct stock & release reservation (same as manual "confirm" in admin)
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQty:    { decrement: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus:    'paid',
          orderStatus:      'confirmed',
          razorpayPaymentId: dto.razorpayPaymentId,
          statusHistory: {
            create: {
              fromStatus: 'placed',
              toStatus: 'confirmed',
              changedBy: userId,
              note: `Payment confirmed — Razorpay payment ID: ${dto.razorpayPaymentId}`,
            },
          },
        },
      });
    });

    // 4. Fire notifications (fire-and-forget — never block the response)
    this.sendOrderPaidNotifications(userId, order, dto.razorpayPaymentId).catch(
      (err) => this.logger.error('Notification failure after payment', err),
    );

    return { success: true, orderNumber: order.orderNumber };
  }

  // ─────────────────────────────────────────────────────────
  // Razorpay webhook (optional, belt-and-suspenders)
  // Call this from the controller with raw body for HMAC check
  // ─────────────────────────────────────────────────────────
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
    if (!webhookSecret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping webhook validation');
      return;
    }

    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      this.logger.warn('Invalid Razorpay webhook signature — ignoring');
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch {
      return;
    }

    if (payload.event !== 'payment.captured') return;

    const rzpOrderId = payload.payload?.payment?.entity?.order_id as string | undefined;
    const rzpPaymentId = payload.payload?.payment?.entity?.id as string | undefined;

    if (!rzpOrderId || !rzpPaymentId) return;

    const order = await this.prisma.order.findFirst({
      where: { razorpayOrderId: rzpOrderId },
      include: { items: true, address: true },
    });

    if (!order || order.paymentStatus === 'paid') return;

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQty:    { decrement: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus:    'paid',
          orderStatus:      'confirmed',
          razorpayPaymentId: rzpPaymentId,
          statusHistory: {
            create: {
              fromStatus: 'placed',
              toStatus: 'confirmed',
              note: `Payment captured via webhook — Razorpay payment ID: ${rzpPaymentId}`,
            },
          },
        },
      });
    });

    this.sendOrderPaidNotifications(order.userId, order as any, rzpPaymentId).catch(
      (err) => this.logger.error('Webhook notification failure', err),
    );
  }

  // ─────────────────────────────────────────────────────────
  // Shared: email + WhatsApp on paid
  // ─────────────────────────────────────────────────────────
  private async sendOrderPaidNotifications(
    userId: string,
    order: any,
    razorpayPaymentId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, firstName: true },
    });
    if (!user) return;

    // Email
    if (user.email) {
      await this.emailService.sendOrderConfirmation(
        user.email,
        user.firstName ?? 'there',
        {
          orderNumber: order.orderNumber,
          totalAmount: Number(order.totalAmount),
          razorpayPaymentId,
          items: order.items.map((i: any) => ({
            snapshotName: i.snapshotName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        },
      );
    }

    // WhatsApp (WATI / any HTTP provider)
    if (user.phone) {
      await this.sendWhatsApp(user.phone, order.orderNumber, Number(order.totalAmount));
    }
  }

  private async sendWhatsApp(phone: string, orderNumber: string, total: number) {
    const apiUrl  = this.config.get<string>('WATI_API_URL');
    const apiKey  = this.config.get<string>('WATI_API_KEY');
    const template = this.config.get<string>('WATI_ORDER_TEMPLATE', 'order_confirmation');

    if (!apiUrl || !apiKey) {
      this.logger.warn('WATI_API_URL / WATI_API_KEY not set — WhatsApp skipped');
      return;
    }

    // Normalise phone: strip leading + or 0, ensure 91 country code
    const normalised = phone.replace(/\D/g, '').replace(/^0+/, '');
    const e164 = normalised.startsWith('91') ? normalised : `91${normalised}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${e164}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          template_name: template,
          broadcast_name: `order_${orderNumber}`,
          parameters: [
            { name: 'order_number', value: orderNumber },
            { name: 'total',        value: `₹${total.toLocaleString('en-IN')}` },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`WhatsApp send failed (${res.status}): ${body}`);
      } else {
        this.logger.log(`WhatsApp sent for order ${orderNumber} to ${e164}`);
      }
    } catch (err) {
      this.logger.error('WhatsApp HTTP error', err);
    }
  }
}
