import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards';
import { PaymentsService } from './payments.service';
import { CreateRazorpayOrderDto, VerifyPaymentDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/payments/create-order
   * Authenticated. Call this BEFORE opening the Razorpay modal.
   * Returns { razorpayOrderId, amount, currency, orderNumber }
   */
  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  createRazorpayOrder(
    @Req() req: any,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    return this.paymentsService.createRazorpayOrder(req.user.id, dto);
  }

  /**
   * POST /api/v1/payments/verify
   * Authenticated. Call this AFTER Razorpay modal succeeds.
   * Verifies HMAC signature → marks order paid → sends email + WhatsApp.
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verifyPayment(
    @Req() req: any,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyAndConfirm(req.user.id, dto);
  }

  /**
   * POST /api/v1/payments/webhook
   * Public (Razorpay calls this). Needs raw body for HMAC verification.
   * Acts as a belt-and-suspenders fallback in case the client-side verify call
   * was lost (network drop after payment, browser closed, etc.)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async razorpayWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) return { received: true };
    await this.paymentsService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
