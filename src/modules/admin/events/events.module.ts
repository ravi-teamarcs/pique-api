import { Module } from '@nestjs/common';
import { EventController } from './events.controller';
import { EventService } from './events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
import { MediaModule } from '../media/media.module';
import { Venue } from 'src/modules/venue/entities/venue.entity';
import { BookingModule } from '../booking/booking.module';
import { Setting } from '../settings/entities/setting.entity';
import { SubcategoryRate } from '../settings/entities/subcategory-rates.entity';
import { SpecialSubcategoryPrice } from '../settings/entities/special-subcategory-prices.entity';
import { EmailModule } from 'src/modules/Email/email.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { EventCategorySubcategory } from './entities/event-category-subcategory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Booking,
      RoleCapability,
      Role,
      Capability,
      Venue,
      Setting,
      SubcategoryRate,
      SpecialSubcategoryPrice,
      EventCategorySubcategory,
    ]),
    MediaModule,
    BookingModule,
    EmailModule,
    NotificationModule,
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventsModule {}
