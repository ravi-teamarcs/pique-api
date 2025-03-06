import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueService } from './venue.service';
import { VenueController } from './venue.controller';
import { Venue } from './entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
import { BookingModule } from '../booking/booking.module';
import { Booking } from '../booking/entities/booking.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Media } from '../media/entities/media.entity';
import { Category } from '../entertainer/entities/categories.entity';
import { Wishlist } from './entities/wishlist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venue,
      User,
      Entertainer,
      Booking,
      Role,
      Access,
      EndPoints,
      Media,
      Category,
      Wishlist,
    ]),
    BookingModule,
  ],
  controllers: [VenueController],
  providers: [VenueService],
})
export class VenueModule {}
