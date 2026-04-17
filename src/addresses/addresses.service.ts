import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    // If this is the first address or isDefault, unset others
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async setDefault(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    return this.prisma.address.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertOwnership(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address || address.deletedAt) throw new NotFoundException(`Address ${id} not found`);
    if (address.userId !== userId) throw new ForbiddenException('Access denied');
    return address;
  }
}
