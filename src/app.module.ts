import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { ProductsModule } from './products/products.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AddressesModule } from './addresses/addresses.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { DiscountsModule } from './discounts/discounts.module';
import { OrdersModule } from './orders/orders.module';
import { BannersModule } from './banners/banners.module';
import { FlashSalesModule } from './flash-sales/flash-sales.module';
import { StorageModule } from './storage/storage.module';
import { MediaController } from './admin/media/media.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { EmailModule } from './email/email.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Global rate limit: 100 requests per minute per IP
    // Auth endpoints override this with stricter limits via @Throttle()
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    EmailModule,
    RedisModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    TagsModule,
    ProductsModule,
    CampaignsModule,
    AddressesModule,
    WishlistModule,
    DiscountsModule,
    OrdersModule,
    BannersModule,
    FlashSalesModule,
    StorageModule,
    AnalyticsModule,
  ],
  controllers: [AppController, MediaController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally to all routes
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
