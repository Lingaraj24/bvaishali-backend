import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tagline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  heading?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  subHeading?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  bannerR2Key?: string;

  @IsString()
  @IsOptional()
  subImage1R2Key?: string;

  @IsString()
  @IsOptional()
  subImage2R2Key?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tagline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  heading?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  subHeading?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  bannerR2Key?: string;

  @IsString()
  @IsOptional()
  subImage1R2Key?: string;

  @IsString()
  @IsOptional()
  subImage2R2Key?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
