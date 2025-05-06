import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoiceCronService } from './invoice-cron.service';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Invoice } from 'src/modules/invoice/entities/invoice.entity';
import { Entertainer } from 'src/modules/entertainer/entities/entertainer.entity';
import { ReminderModule } from '../../reminders/reminder.module';
import { InvoiceMod } from '../../admin/invoice/invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Invoice, Entertainer]),
    InvoiceMod,
    ReminderModule,
  ],
  providers: [InvoiceCronService],
})
export class InvoiceCronModule {}
