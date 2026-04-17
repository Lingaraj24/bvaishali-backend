import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, UpdateDiscountDto, ValidateCouponDto } from './dto/discount.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  validate(@CurrentUser() user: User, @Body() dto: ValidateCouponDto) {
    return this.discountsService.validate(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  findAll() {
    return this.discountsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  create(@CurrentUser() user: User, @Body() dto: CreateDiscountDto) {
    return this.discountsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  remove(@Param('id') id: string) {
    return this.discountsService.remove(id);
  }
}
