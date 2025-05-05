import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoiceCronService } from './invoice-cron.service';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Invoice } from 'src/modules/invoice/entities/invoice.entity';
import { InvoiceModule } from '../../invoice/invoice.module';
import { Entertainer } from 'src/modules/entertainer/entities/entertainer.entity';
import { ReminderModule } from '../../reminders/reminder.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Invoice, Entertainer]),
    InvoiceModule,
    ReminderModule,
  ],
  providers: [InvoiceCronService],
})
export class InvoiceCronModule {}
