import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntertainerService } from './entertainer.service';
import { EntertainerController } from './entertainer.controller';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
// import { Booking } from '../booking/entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from '../booking/entities/booking.entity';
import { BookingModule } from '../booking/booking.module';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Category } from './entities/categories.entity';
import { Media } from '../media/entities/media.entity';
import { Rating } from './entities/rating.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { MediaModule } from '../media/media.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { WeeklyAvailability } from './entities/weekly-availability.entity';
import { UnavailableDate } from './entities/unavailable.entity';
import { VenueEvent } from '../event/entities/event.entity';
import { EntertainerAvailability } from './entities/availability.entity';
import { LocationModule } from '../location/location.module';
import { Cities } from '../location/entities/city.entity';
import { States } from '../location/entities/state.entity';
import { NotificationModule } from '../notification/notification.module';
import { AdminUser } from '../admin/auth/entities/AdminUser.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Entertainer,
      User,
      Venue,
      Booking,
      Role,
      Access,
      EndPoints,
      Category,
      Media,
      Rating,
      Invoice,
      WeeklyAvailability,
      UnavailableDate,
      VenueEvent,
      EntertainerAvailability,
      Cities,
      States,
      AdminUser,
    ]),
    BookingModule,
    MediaModule,
    LocationModule,
    NotificationModule,
  ],
  controllers: [EntertainerController, AvailabilityController],
  providers: [EntertainerService, AvailabilityService],
})
export class EntertainerModule {}
