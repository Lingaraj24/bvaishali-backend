import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  ProductQueryDto,
} from './dto/product.dto';
import { Prisma, VideoType, ImageType } from '@prisma/client';

const PRODUCT_DETAIL_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  campaign: { select: { id: true, title: true, slug: true } },
  variants: { where: { isActive: true }, orderBy: { size: 'asc' as const } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  videos: { orderBy: { sortOrder: 'asc' as const } },
  tags: { include: { tag: true } },
  flashSales: {
    where: { isActive: true, endsAt: { gt: new Date() } },
    take: 1,
  },
} satisfies Prisma.ProductInclude;

const PRODUCT_LIST_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1 },
  variants: {
    where: { isActive: true },
    select: { id: true, size: true, stockQty: true, reservedQty: true, priceOverrideInr: true },
  },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: 'published',
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.category && { category: { slug: query.category } }),
      ...(query.tag && { tags: { some: { tag: { slug: query.tag } } } }),
      ...(query.minPrice !== undefined && {
        priceInr: { gte: query.minPrice },
      }),
      ...(query.maxPrice !== undefined && {
        priceInr: { lte: query.maxPrice },
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { priceInr: 'asc' }
        : query.sort === 'price_desc'
          ? { priceInr: 'desc' }
          : query.sort === 'featured'
            ? { isFeatured: 'desc' }
            : { createdAt: 'desc' };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: PRODUCT_LIST_INCLUDE,
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    };
  }

  async findFeatured() {
    return this.prisma.product.findMany({
      where: { status: 'published', isFeatured: true },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: PRODUCT_LIST_INCLUDE,
    });
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException(`Product '${slug}' not found`);
    return product;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already exists`);

    const { tagIds, variants, images, video, categoryId, campaignId, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        priceInr: productData.priceInr as any,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(campaignId && { campaign: { connect: { id: campaignId } } }),
        ...(tagIds?.length && {
          tags: {
            create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
          },
        }),
        ...(variants?.length && {
          variants: { create: variants },
        }),
        ...(images?.length && {
          images: {
            create: images.map((img, idx) => ({
              r2ObjectKey: img.r2ObjectKey,
              altText: img.altText ?? '',
              isPrimary: img.isPrimary ?? idx === 0,
              sortOrder: img.sortOrder ?? idx,
              imageType: ImageType.gallery,
            })),
          },
        }),
        ...(video && {
          videos: {
            create: [{
              r2ObjectKey: video.r2ObjectKey,
              videoType: VideoType.fabric_drape,
              thumbnailR2Key: video.thumbnailR2Key,
              durationSecs: video.durationSecs,
              sortOrder: 0,
            }],
          },
        }),
      },
      include: PRODUCT_DETAIL_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);
    const { tagIds, ...productData } = dto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
          },
        }),
      },
      include: PRODUCT_DETAIL_INCLUDE,
    });
  }

  async archive(id: string) {
    await this.findById(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  // ── Variants ──────────────────────────────────────

  async addVariant(productId: string, dto: CreateVariantDto) {
    await this.findById(productId);
    const existing = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`SKU '${dto.sku}' already exists`);
    return this.prisma.productVariant.create({
      data: { ...dto, productId },
    });
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
    return this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
  }

  async removeVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }
}
