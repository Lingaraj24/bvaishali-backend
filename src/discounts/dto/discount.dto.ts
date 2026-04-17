import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderValue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscountCap?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  perUserLimit?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

export class UpdateDiscountDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  orderTotal: number;
}
