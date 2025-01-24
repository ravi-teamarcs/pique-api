import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntertainerService } from './entertainer.service';
import { EntertainerController } from './entertainer.controller';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
// import { Booking } from '../booking/entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';
// import { VenueService } from '../venue/venue.service';

@Module({
  imports: [TypeOrmModule.forFeature([Entertainer, User, Venue])],
  controllers: [EntertainerController],
  providers: [EntertainerService, VenueService],
})
export class EntertainerModule {}
