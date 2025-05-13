import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { User } from '../users/entities/users.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { MediaModule } from '../media/media.module';
import { AdminCreatedUser } from '../users/entities/admin.created.entity';
import { Not } from 'typeorm';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { EmailModule } from 'src/modules/Email/email.module';
import { Booking } from '../booking/entities/booking.entity';
import { BookingLog } from '../booking/entities/booking-log.entity';
import { Entertainer } from '../../admin/entertainer/entities/entertainer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venue,
      User,
      Role,
      RoleCapability,
      Capability,
      Neighbourhood,
      AdminCreatedUser,
      Booking,
      BookingLog,
      Entertainer,
    ]),
    MediaModule,
    NotificationModule,
    EmailModule,
  ],
  controllers: [VenueController],
  providers: [VenueService],
})
export class VenueModule {}
