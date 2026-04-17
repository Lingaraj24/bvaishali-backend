import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StorageService } from '../../storage/storage.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';

@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.manager)
export class MediaController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * GET /api/v1/admin/media/presigned-url
   * Generates a presigned URL for uploading a file directly to R2.
   */
  @Get('presigned-url')
  async getPresignedUrl(
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
    @Query('folder') folder: string = 'products',
  ) {
    if (!fileName || !contentType) {
      throw new BadRequestException('fileName and contentType are required');
    }

    return this.storageService.getPresignedPutUrl(fileName, contentType, folder);
  }
}
