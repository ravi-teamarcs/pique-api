import { Controller, Get } from '@nestjs/common';
import { ReminderService } from './reminder.service';

@Controller('reminder')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}
  @Get()
  async one() {
    return this.reminderService.handleEventCompletionReminders();
  }
}
