import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlashSalesService {
  constructor(private prisma: PrismaService) {}

  async findActive() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: { where: { isActive: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  async findByProductId(productId: string) {
    const now = new Date();
    return this.prisma.flashSale.findFirst({
      where: {
        productId,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
    });
  }
}
