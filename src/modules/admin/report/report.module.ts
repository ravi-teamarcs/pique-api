import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entertainer } from '../entertainer/Entitiy/entertainer.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Venue } from '../venue/Entity/venue.entity';
import { Invoice } from '../invoice/Entity/invoices.entity';
import { Event } from '../events/Entity/event.entity';

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
