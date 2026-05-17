import { Controller, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RemindersService } from './reminders.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';

@Controller('events/:eventId/reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post('run')
  @Roles(Role.ADMIN)
  run(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.reminders.run(eventId, user);
  }
}
