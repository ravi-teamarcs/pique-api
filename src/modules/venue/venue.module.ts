import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueService } from './venue.service';
import { VenueController } from './venue.controller';
import { Venue } from './entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EntertainerService } from '../entertainer/entertainer.service';
import { User } from '../users/entities/users.entity';
import { Booking } from '../booking/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venue, Entertainer, User, Booking])],
  controllers: [VenueController],
  providers: [VenueService, EntertainerService],
})
export class VenueModule {}
