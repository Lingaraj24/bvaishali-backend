import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class PlaceOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class AddShipmentDto {
  @IsString()
  @IsNotEmpty()
  carrier: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @IsString()
  @IsOptional()
  trackingUrl?: string;

  @IsString()
  @IsOptional()
  awbNumber?: string;
}

export class AdminOrderQueryDto {
  @IsString()
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
