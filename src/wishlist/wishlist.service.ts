import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: { where: { isActive: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new ConflictException('Product already in wishlist');

    return this.prisma.wishlistItem.create({
      data: { userId, productId },
      include: {
        product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
      },
    });
  }

  async remove(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Product not in wishlist');
    return this.prisma.wishlistItem.delete({
      where: { userId_productId: { userId, productId } },
    });
  }
}
