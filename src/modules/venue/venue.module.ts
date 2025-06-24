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
import { MediaModule } from '../media/media.module';

import { NotificationModule } from '../notification/notification.module';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { Cities } from '../location/entities/city.entity';
import { States } from '../location/entities/state.entity';
import { EntertainerModule } from '../entertainer/entertainer.module';
import { VenueEvent } from '../event/entities/event.entity';
import { Setting } from '../admin/settings/entities/setting.entity';
import { LocationModule } from '../location/location.module';
import { AdminUser } from '../admin/auth/entities/AdminUser.entity';
import { EntertainerCategorySubcategory } from '../entertainer/entities/entertainer-category-subcategory.entity';
import { SubcategoryRate } from '../admin/settings/entities/subcategory-rates.entity';
import { SpecialSubcategoryPrice } from '../admin/settings/entities/special-subcategory-prices.entity';

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
      Neighbourhood,
      Cities,
      States,
      VenueEvent,
      Setting,
      AdminUser,
      EntertainerCategorySubcategory,
      SubcategoryRate,
      SpecialSubcategoryPrice,
    ]),
    BookingModule,
    MediaModule,
    NotificationModule,
    LocationModule,
  ],
  controllers: [VenueController],
  providers: [VenueService],
})
export class VenueModule {}
