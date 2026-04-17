import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { BannerPosition } from '@prisma/client';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async findActive(position?: BannerPosition) {
    const now = new Date();
    return this.prisma.promotionalBanner.findMany({
      where: {
        isActive: true,
        ...(position && { position }),
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.promotionalBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async create(dto: CreateBannerDto) {
    return this.prisma.promotionalBanner.create({
      data: {
        title: dto.title ?? '',
        headline: dto.title,
        ctaText: dto.ctaText,
        ctaUrl: dto.ctaUrl,
        imageR2Key: dto.imageR2Key,
        position: dto.position,
        sortOrder: dto.sortOrder ?? 0,
        validFrom: dto.startsAt ? new Date(dto.startsAt) : undefined,
        validUntil: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.findById(id);
    return this.prisma.promotionalBanner.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        headline: dto.title,
        ctaText: dto.ctaText,
        ctaUrl: dto.ctaUrl,
        sortOrder: dto.sortOrder,
        validFrom: dto.startsAt ? new Date(dto.startsAt) : undefined,
        validUntil: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.promotionalBanner.delete({ where: { id } });
  }

  private async findById(id: string) {
    const b = await this.prisma.promotionalBanner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException(`Banner ${id} not found`);
    return b;
  }
}
