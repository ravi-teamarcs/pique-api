import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoiceCronService } from './invoice-cron.service';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Invoice } from 'src/modules/invoice/entities/invoice.entity';
import { InvoiceModule } from 'src/modules/invoice/invoice.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Invoice]), InvoiceModule],
  providers: [InvoiceCronService],
})
export class InvoiceCronModule {}
