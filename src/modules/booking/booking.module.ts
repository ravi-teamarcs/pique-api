import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Venue } from '../venue/entities/venue.entity';
import { BookingRequest } from './entities/changeBooking.entity';
import { BookingLog } from './entities/booking-log.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EmailModule } from '../Email/email.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Booking,
      Role,
      Access,
      EndPoints,
      Venue,
      BookingRequest,
      BookingLog,
      User,
      Entertainer,
    ]),
    EmailModule,
    NotificationModule
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
