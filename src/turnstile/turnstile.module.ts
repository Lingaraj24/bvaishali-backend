import { Module } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';

@Module({
  providers: [TurnstileGuard],
  exports: [TurnstileGuard],
})
export class TurnstileModule {}
