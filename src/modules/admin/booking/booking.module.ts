import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { Role } from '../adminuser/entities/role.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { EmailModule } from 'src/modules/Email/email.module';
import { BookingRequest } from './entities/modify-booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      RoleCapability,
      Role,
      Capability,
      BookingRequest,
    ]),
    NotificationModule,
    EmailModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
