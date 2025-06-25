import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './entities/invoices.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerateInvoiceService } from 'src/common/invoice/generateinvoice.service';
import { Event } from '../events/entities/event.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
import { EmailModule } from 'src/modules/Email/email.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { AdminUser } from '../auth/entities/AdminUser.entity';
import { Venue } from '../venue/entities/venue.entity';
import { InvoiceEvent } from './entities/invoices-event.entity';
import { Setting } from '../settings/entities/setting.entity';
import { EntertainerInvoice } from './entities/entertainer-invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Event,
      Entertainer,
      Booking,
      RoleCapability,
      Role,
      Capability,
      AdminUser,
      Venue,
      InvoiceEvent,
      Setting,
      EntertainerInvoice,
    ]),
    EmailModule,
    NotificationModule,
  ],
  providers: [InvoiceService, GenerateInvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceMod {}
