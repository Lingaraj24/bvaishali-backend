import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BannerPosition } from '@prisma/client';

export class CreateBannerDto {
  @IsEnum(BannerPosition)
  position: BannerPosition;

  @IsString()
  @IsOptional()
  imageR2Key?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  ctaText?: string;

  @IsString()
  @IsOptional()
  ctaUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

export class UpdateBannerDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  headline?: string;

  @IsString()
  @IsOptional()
  eyebrow?: string;

  @IsString()
  @IsOptional()
  subText?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  ctaText?: string;

  @IsString()
  @IsOptional()
  ctaUrl?: string;

  @IsString()
  @IsOptional()
  imageR2Key?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;
}
