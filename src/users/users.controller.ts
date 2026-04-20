import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  NotFoundException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  /** GET /api/v1/users/me — current user's profile */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  /**
   * PATCH /api/v1/users/me
   * Update editable profile fields.
   * Phone and email are intentionally excluded — they cannot be changed here.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * GET /api/v1/users/me/avatar-upload-url
   * Returns a short-lived presigned PUT URL so the client can upload
   * a profile photo directly to R2 without routing through the API.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/avatar-upload-url')
  async getAvatarUploadUrl(
    @CurrentUser() user: User,
    @Query('contentType') contentType: string,
  ) {
    if (!contentType) throw new BadRequestException('contentType is required');
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = `avatar-${user.id}.${ext}`;
    return this.storageService.getPresignedPutUrl(fileName, contentType, 'avatars');
  }

  /** GET /api/v1/users/:id  — admin only */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
