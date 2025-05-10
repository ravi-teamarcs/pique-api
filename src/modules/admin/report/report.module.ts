import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Event } from '../events/entities/event.entity';

import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Entertainer, Booking, Venue, Invoice, Role, Capability, RoleCapability]),
  ],
  providers: [ReportService],
  controllers: [ReportController]
})
export class ReportModule { }
