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

  // Cron Job for Event Reminder before  (Before 30 days , 10 days , 1 day).
  @Cron('0 0 * * *')
  async sendEventReminder() {
    await this.reminderService.eventReminder();
  }

  // Cron Job to  remindUnresponded invites
  @Cron('0 0 * * *')
  async unrespondedBookingReminder() {
    await this.reminderService.remindUnrespondedInvites();
  }
  @Cron('0 * * * *') // Runs at minute 0 of every hour
  async syncAdminLatestBooking() {}

  // Cron Job To Add overdues day
  @Cron('0 0 * * *')
  async handleOverDues() {
    await this.invoiceService.handleOverdueInvoices();
  }

  // Cron Job to apply late Fee
  // @Cron(CronExpression.EVERY_6_HOURS)
  // async applyLateFee() {
  //   this.invoiceService.applyLateFee();
  // }

  // Event Completion sending email to complete event.
  @Cron(CronExpression.EVERY_HOUR)
  async eventCompletion() {
    await this.reminderService.handleEventCompletionReminders();
  }
  //Reminder to Venues to book entertainer later.
  @Cron(CronExpression.EVERY_HOUR)
  async bookLaterReminders() {
    await this.reminderService.handleReminders();
  }
  // Cron Job to delete notification older than 60 Days.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    await this.notificationService.deleteOldNotifications();
  }
}
