import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { isLastDayOfMonth } from 'date-fns';
import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import { InvoiceService } from '../../invoice/invoice.service';
import { Repository } from 'typeorm';
import { ReminderService } from 'src/modules/reminders/reminder.service';

@Injectable()
export class InvoiceCronService {
  constructor(
    private readonly invoiceService: InvoiceService,
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    private readonly reminderService: ReminderService,
  ) {}

  @Cron('0 0 * * *')
  async sendEventReminder() {
    await this.reminderService.eventReminder();
  }
  @Cron('0 0 * * *')
  async unrespondedBookingReminder() {
    await this.reminderService.remindUnrespondedInvites();
  }
  @Cron('0 * * * *') // Runs at minute 0 of every hour
  async syncAdminLatestBooking() {}
}
