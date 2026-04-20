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
        imageR2Key: dto.imageR2Key ?? '',
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
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        // headline field: explicit `headline` beats legacy `title` mapping
        ...(dto.headline !== undefined && { headline: dto.headline }),
        ...(dto.title !== undefined && { title: dto.title, headline: dto.title }),
        // For hero slides: eyebrow stored in ctaText, subText stored in ctaUrl
        ...(dto.eyebrow !== undefined && { ctaText: dto.eyebrow }),
        ...(dto.subText !== undefined && { ctaUrl: dto.subText }),
        ...(dto.ctaText !== undefined && { ctaText: dto.ctaText }),
        ...(dto.ctaUrl !== undefined && { ctaUrl: dto.ctaUrl }),
        ...(dto.imageR2Key !== undefined && { imageR2Key: dto.imageR2Key }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.startsAt && { validFrom: new Date(dto.startsAt) }),
        ...(dto.endsAt && { validUntil: new Date(dto.endsAt) }),
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
