import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { User } from '../users/entities/users.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { Event } from '../events/entities/event.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      User,
      RoleCapability,
      Role,
      Capability,
      Event,
      Invoice,
      Entertainer,
      Venue,
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
