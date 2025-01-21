import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Entertainer, User, Booking, Venue])],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
