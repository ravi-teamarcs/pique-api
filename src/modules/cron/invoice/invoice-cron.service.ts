import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { isLastDayOfMonth } from 'date-fns';
import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import { MoreThan, Repository } from 'typeorm';
import { ReminderService } from 'src/modules/reminders/reminder.service';
import { InvoiceService } from '../../admin/invoice/invoice.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { CronJobLog } from '../entities/cron-log.entity';
import { Invoice } from 'src/modules/admin/invoice/entities/invoices.entity';

@Injectable()
export class InvoiceCronService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(CronJobLog)
    private readonly cronJobLogRepository: Repository<CronJobLog>,

    private readonly reminderService: ReminderService,
    private readonly invoiceService: InvoiceService,
    private readonly notificationService: NotificationService,
  ) {}

  // Cron Job for Event Reminder before  (Before 30 days , 10 days , 1 day).
  @Cron('0 0 * * *')
  async sendEventReminder() {
    let savedLog: any;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'sendEventReminder',
        startedAt: new Date(),
        runBy: 'system',
      });
      savedLog = await this.cronJobLogRepository.save(log);
      await this.reminderService.eventReminder();
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }

  // Cron Job to  remindUnresponded invites
  @Cron('0 0 * * *')
  async unrespondedBookingReminder() {
    let savedLog: any;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'unrespondedBookingReminder',
        startedAt: new Date(),
        runBy: 'system',
      });
      savedLog = await this.cronJobLogRepository.save(log);

      await this.reminderService.remindUnrespondedInvites();
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }
  @Cron('0 * * * *') // Runs at minute 0 of every hour
  async syncAdminLatestBooking() {}

  // Cron Job To Add overdues day
  @Cron('0 0 * * *')
  async handleOverDues() {
    let savedLog: any;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'handleOverDues',
        startedAt: new Date(),
        runBy: 'system',
      });

      savedLog = await this.cronJobLogRepository.save(log);
      await this.invoiceService.handleOverdueInvoices();
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }

  // Cron Job to apply late Fee
  @Cron(CronExpression.EVERY_6_HOURS)
  async applyLateFee() {
    let savedLog: any;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'applyLateFee',
        startedAt: new Date(),
        runBy: 'system',
      });
      savedLog = await this.cronJobLogRepository.save(log);
      // Fetch All
      const invoices = await this.invoiceRepository.find({
        where: {
          overdue: MoreThan(0),
          status: 'awaiting payment',
        },
      });
      if (invoices.length > 0) {
        for (const invoice of invoices) {
          await this.invoiceService.applyLateFee(Number(invoice.id));
        }
      }

      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }

  // Event Completion sending email to complete event.
  @Cron(CronExpression.EVERY_HOUR)
  async eventCompletion() {
    let savedLog: any;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'eventCompletion',
        startedAt: new Date(),
        runBy: 'system',
      });
      savedLog = await this.cronJobLogRepository.save(log);
      await this.reminderService.handleEventCompletionReminders();
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }
  //Reminder to Venues to book entertainer later.
  @Cron(CronExpression.EVERY_HOUR)
  async bookLaterReminders() {
    let savedLog: any;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'handleReminders',
        startedAt: new Date(),
        runBy: 'system',
      });
      savedLog = await this.cronJobLogRepository.save(log);
      await this.reminderService.handleReminders();
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }
  // Cron Job to delete notification older than 60 Days.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    let savedLog;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'deleteOldNotifications',
        startedAt: new Date(),
        runBy: 'system',
      });

      savedLog = await this.cronJobLogRepository.save(log);
      await this.notificationService.deleteOldNotifications();
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }

  // Cron Job to generate invoice for venues. At 12:00 am  1 Day of month
  @Cron('0 0 1 * *')
  async generateMonthlyInvoices() {
    let savedLog;
    try {
      const log = this.cronJobLogRepository.create({
        jobName: 'generateMonthlyInvoices',
        startedAt: new Date(),
        runBy: 'system',
      });

      savedLog = await this.cronJobLogRepository.save(log);
      this.invoiceService.generateMonthlyInvoiceForVenue();
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        { status: 'success' },
      );
    } catch (error) {
      await this.cronJobLogRepository.update(
        { id: savedLog.id },
        {
          status: 'failure',
          error: error?.stack || error?.message || 'Unknown error',
          endedAt: new Date(),
        },
      );
    }
  }
}
