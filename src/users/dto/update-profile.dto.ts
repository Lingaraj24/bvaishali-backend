import { IsString, IsOptional, IsDateString, IsEmail, MaxLength, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsIn(['Mr.', 'Mrs.', 'Ms.', 'Mx.', 'Dr.', 'Other'])
  salutation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  alternatePhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  alternateEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarR2Key?: string;
}
