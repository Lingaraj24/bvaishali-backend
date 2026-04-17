import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: User) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post(':productId')
  add(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.id, productId);
  }
}
