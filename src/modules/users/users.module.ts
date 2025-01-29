import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/users.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { VenueEvent } from '../event/entities/event.entity';
import { Media } from '../media/entities/media.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Entertainer,
      Venue,
      Booking,
      Invoice,
      VenueEvent,
      Media,
      Role,
      Access,
      EndPoints,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
