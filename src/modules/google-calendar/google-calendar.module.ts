import { Module } from '@nestjs/common';
import { GoogleCalendarServices } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGoogleToken } from './entities/google-token.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { BookingCalendarSync } from '../booking/entities/booking-sync.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserGoogleToken,
      Role,
      Access,
      EndPoints,
      Booking,
      Venue,
      Entertainer,
      BookingCalendarSync,
    ]),
  ],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarServices],
  exports: [GoogleCalendarServices],
})
export class GoogleCalendarModule {}
