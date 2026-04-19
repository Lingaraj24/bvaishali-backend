import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DiscountsModule } from '../discounts/discounts.module';
import { TurnstileModule } from '../turnstile/turnstile.module';

@Module({
  imports: [DiscountsModule, TurnstileModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
