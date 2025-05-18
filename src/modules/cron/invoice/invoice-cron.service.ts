import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { isLastDayOfMonth } from 'date-fns';
import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import { Repository } from 'typeorm';
import { ReminderService } from 'src/modules/reminders/reminder.service';
import { InvoiceService } from '../../admin/invoice/invoice.service';
import { NotificationService } from 'src/modules/notification/notification.service';

@Injectable()
export class InvoiceCronService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    private readonly reminderService: ReminderService,
    private readonly invoiceService: InvoiceService,
    private readonly notificationService: NotificationService,
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

  @Cron('0 0 * * *')
  async handleOverDues() {
    await this.invoiceService.handleOverdueInvoices();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async eventCompletion() {
    await this.reminderService.handleEventCompletionReminders();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    await this.notificationService.deleteOldNotifications();
  }
}
