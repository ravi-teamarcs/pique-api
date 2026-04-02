import { Body, Controller, Get, Post } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { BookLater } from './dto/book-later.dto';

@Controller('reminder')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}
  @Get()
  async one() {
    return this.reminderService.handleEventCompletionReminders();
  }

  @Post('booking')
  async saveBookingReminder(@Body() dto: BookLater) {
    return this.reminderService.saveBookingReminder(dto);
  }
}
