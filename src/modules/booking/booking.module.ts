import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';
import { Venue } from '../venue/entities/venue.entity';
import { BookingRequest } from './entities/changeBooking.entity';
import { BookingLog } from './entities/booking-log.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EmailModule } from '../Email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { Event } from '../admin/events/entities/event.entity';
import { EntertainerAvailability } from '../entertainer/entities/availability.entity';
import { VenueEvent } from '../event/entities/event.entity';
import { CancellationReason } from './entities/cancelation-reason.entity';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingCancellationController } from './booking-cancellation.controller';
import { BookingCancellation } from './entities/booking-cancellation.entity';
import { EntertainerModule } from '../entertainer/entertainer.module';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceEvent } from '../admin/invoice/entities/invoices-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Booking,
      Role,
      Access,
      EndPoints,
      Venue,
      BookingRequest,
      BookingLog,
      User,
      Entertainer,
      EntertainerAvailability,
      Event,
      VenueEvent,
      CancellationReason,
      BookingCancellation,
      Invoice,
      InvoiceEvent,
    ]),
    EmailModule,
    NotificationModule,
    GoogleCalendarModule,
  ],
  controllers: [BookingController, BookingCancellationController],
  providers: [BookingService, BookingCancellationService],
  exports: [BookingService],
})
export class BookingModule {}
