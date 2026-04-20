import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  r2ObjectKey: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class CreateProductVideoDto {
  @IsString()
  @IsNotEmpty()
  r2ObjectKey: string;

  @IsString()
  @IsOptional()
  thumbnailR2Key?: string;

  @IsNumber()
  @IsOptional()
  durationSecs?: number;
}

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @Min(0)
  stockQty: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceOverrideInr?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  lowStockThreshold?: number;
}

export class UpdateVariantDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQty?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceOverrideInr?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fabricStory?: string;

  @IsString()
  @IsOptional()
  careInstructions?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsNumber()
  @Min(0)
  priceInr: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceUsd?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPriceInr?: number;

  @IsBoolean()
  @IsOptional()
  isCustomOrder?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  leadDays?: number;

  @IsNumber()
  @IsOptional()
  weightGrams?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @IsOptional()
  @Type(() => CreateProductVideoDto)
  video?: CreateProductVideoDto;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fabricStory?: string;

  @IsString()
  @IsOptional()
  careInstructions?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceInr?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceUsd?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPriceInr?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}

export class ProductQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsString()
  @IsOptional()
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'featured';

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 24;
}
