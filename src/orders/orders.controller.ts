import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  PlaceOrderDto,
  UpdateOrderStatusDto,
  AddShipmentDto,
  AdminOrderQueryDto,
} from './dto/order.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { TurnstileGuard } from '../turnstile/turnstile.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Customer routes ────────────────────────────────

  @Get()
  getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.getMyOrders(user.id);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  getAllOrders(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.getAllOrders(query);
  }

  @Get(':orderNumber')
  getMyOrder(@CurrentUser() user: User, @Param('orderNumber') orderNumber: string) {
    return this.ordersService.getMyOrder(user.id, orderNumber);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TurnstileGuard)
  placeOrder(@CurrentUser() user: User, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(user.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user.id, id);
  }

  // ── Admin routes ───────────────────────────────────

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.id, dto);
  }

  @Get(':id/shipment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  getShipment(@Param('id') id: string) {
    return this.ordersService.getShipment(id);
  }

  @Post(':id/shipment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  addShipment(@Param('id') id: string, @Body() dto: AddShipmentDto) {
    return this.ordersService.addShipment(id, dto);
  }
}
