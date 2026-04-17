import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DiscountsModule } from '../discounts/discounts.module';
import { EmailModule } from '../email/email.module';
import { TurnstileModule } from '../turnstile/turnstile.module';

@Module({
  imports: [DiscountsModule, EmailModule, TurnstileModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
