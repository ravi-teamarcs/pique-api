import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './Entity/invoices.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerateInvoiceService } from 'src/common/invoice/generateinvoice.service';
import { Event } from '../events/Entity/event.entity';
import { Entertainer } from '../entertainer/Entitiy/entertainer.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';


import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Event, Entertainer, Booking,RoleCapability, Role, Capability]),
  ],
  providers: [InvoiceService, GenerateInvoiceService],
  controllers: [InvoiceController]
})
export class InvoiceMod { }
