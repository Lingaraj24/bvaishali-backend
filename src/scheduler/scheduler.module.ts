import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [UsersModule, EmailModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
