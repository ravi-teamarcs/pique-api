import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './Entity/invoices.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerateInvoiceService } from 'src/common/invoice/generateinvoice.service';
import { Event } from '../events/Entity/event.entity';
import { Entertainer } from '../entertainer/Entitiy/entertainer.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Event, Entertainer, Booking]),
  ],
  providers: [InvoiceService, GenerateInvoiceService],
  controllers: [InvoiceController]
})
export class InvoiceMod { }
