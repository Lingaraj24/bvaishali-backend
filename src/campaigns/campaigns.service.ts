import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.campaign.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findAllAdmin() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findBySlug(slug: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { slug },
      include: {
        products: {
          where: { status: 'published' },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: { where: { isActive: true } },
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign '${slug}' not found`);
    return campaign;
  }

  async create(dto: CreateCampaignDto) {
    const existing = await this.prisma.campaign.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already exists`);
    return this.prisma.campaign.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        tagline: dto.tagline,
        heading: dto.heading,
        subHeading: dto.subHeading,
        description: dto.description,
        heroR2Key: dto.bannerR2Key,
        subImage1R2Key: dto.subImage1R2Key,
        subImage2R2Key: dto.subImage2R2Key,
        isActive: dto.isActive ?? true,
        publishedAt: dto.isActive !== false ? new Date() : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findById(id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.tagline !== undefined && { tagline: dto.tagline }),
        ...(dto.heading !== undefined && { heading: dto.heading }),
        ...(dto.subHeading !== undefined && { subHeading: dto.subHeading }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.bannerR2Key !== undefined && { heroR2Key: dto.bannerR2Key }),
        ...(dto.subImage1R2Key !== undefined && { subImage1R2Key: dto.subImage1R2Key }),
        ...(dto.subImage2R2Key !== undefined && { subImage2R2Key: dto.subImage2R2Key }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  private async findById(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Campaign ${id} not found`);
    return c;
  }
}
