import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { productTags: true } } },
    });
  }

  async create(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already exists`);
    return this.prisma.tag.create({ data: dto });
  }

  async remove(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return this.prisma.tag.delete({ where: { id } });
  }
}
