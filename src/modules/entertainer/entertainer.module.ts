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
import { RatingsService } from './rating.service';
import { RatingsController } from './rating.controller';
import { Invoice } from '../invoice/entities/invoice.entity';
// import { VenueService } from '../venue/venue.service';

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
    ]),
    BookingModule,
  ],
  controllers: [EntertainerController, RatingsController],
  providers: [EntertainerService, RatingsService],
})
export class EntertainerModule {}
