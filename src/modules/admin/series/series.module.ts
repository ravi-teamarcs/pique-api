import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeriesController } from './series.controller';
import { AdminSeriesService } from './series.service';
import { Module } from '@nestjs/common';
import { Capability } from '../adminuser/entities/capability.entity';
import { Series } from './entities/series.entity';
import { Role } from '../auth/entities/role.entity';
import { Venue } from '../venue/entities/venue.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Event } from '../events/entities/event.entity';
import { Booking } from '../booking/entities/booking.entity';
import { BookingModule } from '../booking/booking.module';
import { Categories } from '../entertainer/entities/Category.entity';
import { Neighbourhood } from '../venue/entities/neighbourhood.entity';
import { EventCategorySubcategory } from '../events/entities/event-category-subcategory.entity';
import { BookingCategorySubcategory } from 'src/modules/booking/entities/booking-category.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Venue,
      RoleCapability,
      Role,
      Capability,
      Series,
      Booking,
      Categories,
      Neighbourhood,
      EventCategorySubcategory,
      BookingCategorySubcategory,
      Entertainer

    ]),
    BookingModule,
  ],
  controllers: [AdminSeriesController],
  providers: [AdminSeriesService],
})
export class AdminSeriesModule {}
