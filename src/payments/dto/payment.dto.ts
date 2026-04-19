import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string; // our internal DB order UUID
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;

  @IsString()
  @IsNotEmpty()
  orderId: string; // our internal DB order UUID
}
