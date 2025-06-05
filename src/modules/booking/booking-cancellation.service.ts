import { InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CancellationReason } from './entities/cancelation-reason.entity';
import { Repository } from 'typeorm';
import { CreateBookingCancellationDto } from './dto/bookin-reason-cancellation.dto';
import { BookingCancellation } from './entities/booking-cancellation.entity';
import { Booking } from './entities/booking.entity';

export class BookingCancellationService {
  constructor(
    @InjectRepository(CancellationReason)
    private readonly cancellationReasonRepo: Repository<CancellationReason>,
    @InjectRepository(BookingCancellation)
    private readonly bookingCancellationRepo: Repository<BookingCancellation>,
  ) {}

  async getCancellationReasons() {
    try {
      const reasons = await this.cancellationReasonRepo.find({
        where: { isActive: true },
        order: { reason: 'ASC' },
      });
      return {
        message: 'Cancellation reasons fetched successfully',
        data: reasons,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async cancelBookingReason(dto: CreateBookingCancellationDto) {
    try {
      const cancellationReason = this.bookingCancellationRepo.create(dto);
      const savedReason =
        await this.bookingCancellationRepo.save(cancellationReason);
      return {
        message: 'Booking cancellation reason saved  successfully',
        status: true,
        data: savedReason,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
