import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { Booking } from '../booking/entities/booking.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Invoice } from '../admin/invoice/Entity/invoices.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Invoice, Booking, Entertainer, Venue]),
  ],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [],
})
export class InvoiceModule {}
