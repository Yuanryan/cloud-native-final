import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { ScopeModule } from '../scope/scope.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ScopeModule, RedisModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
