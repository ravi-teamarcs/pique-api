import { Module } from '@nestjs/common';
import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueEvent } from '../event/entities/event.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Series } from './entities/series.entity';
import { Booking } from '../booking/entities/booking.entity';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VenueEvent,
      Venue,
      Role,
      Access,
      EndPoints,
      Series,
      Booking,
    ]),
    BookingModule,
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
})
export class SeriesModule {}
