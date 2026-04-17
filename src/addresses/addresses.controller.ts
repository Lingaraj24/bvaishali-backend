import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.addressesService.findAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: User, @Param('id') id: string) {
    return this.addressesService.setDefault(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.addressesService.remove(user.id, id);
  }
}
