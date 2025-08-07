import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { VenueEvent } from './entities/event.entity';

import { User } from '../users/entities/users.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Venue } from '../venue/entities/venue.entity';
import { EmailModule } from '../Email/email.module';
import { Booking } from '../booking/entities/booking.entity';
import { BookingModule } from '../booking/booking.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VenueEvent,
      Role,
      Access,
      EndPoints,
      Venue,
      Booking,
    ]),
    EmailModule,
    BookingModule,
    NotificationModule,
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [],
})
export class EventModule {}
