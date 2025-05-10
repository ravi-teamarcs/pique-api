import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from './auth/auth.module';
import { VenueModule } from './venue/venue.module';
import { EntertainerModule } from './entertainer/entertainer.module';
import { AdminuserModule } from './adminuser/adminuser.module';
import { UsersModule } from './users/users.module';
import { Venue } from './venue/entities/venue.entity';
import { AdminUser } from './adminuser/entities/AdminUser.entity';
import { Capability } from './adminuser/entities/capability.entity';
import { RoleCapability } from './auth/entities/role-capabilities.entity';
import { Role } from './auth/entities/role.entity';
import { Entertainer } from './entertainer/entities/entertainer.entity';
import { MediaModule } from './media/media.module';
import { Media } from './media/entities/media.entity';
import { States } from './location/entities/state.entity';
import { Cities } from './location/entities/city.entity';
import { Countries } from './location/entities/country.entity';
import { LocationModule } from './location/location.module';
import { Invoice } from './invoice/entities/invoices.entity';
import { InvoiceMod } from './invoice/invoice.module';
import { EventsModule } from './events/events.module';
import { Booking } from './booking/entities/booking.entity';
import { Event } from './events/entities/event.entity';
import { ReportModule } from './report/report.module';
import { BookingModule } from './booking/booking.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venue,
      User,
      AdminUser,
      Capability,
      RoleCapability,
      Role,
      Entertainer,
      Media,
      Countries,
      Cities,
      States,
      Invoice,
      Event,
      Booking,
    ]),
    AuthModule,
    VenueModule,
    EntertainerModule,
    AdminuserModule,
    UsersModule,
    MediaModule,
    LocationModule,
    InvoiceMod,
    EventsModule,
    ReportModule,
    BookingModule,
    DashboardModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
