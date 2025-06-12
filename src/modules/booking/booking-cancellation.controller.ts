import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingCancellationService } from './booking-cancellation.service';
import { CreateBookingCancellationDto } from './dto/bookin-reason-cancellation.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('booking-cancellations')
export class BookingCancellationController {
  constructor(
    private readonly cancellationService: BookingCancellationService,
  ) {}

  @Get('reasons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getCancellationReasons() {
    return this.cancellationService.getCancellationReasons();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async cancelBooking(@Body() dto: CreateBookingCancellationDto) {
    return this.cancellationService.cancelBookingReason(dto);
  }

  @Get('reason/:bookingId')
  getEntertainerBookingCancellationReason(
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.cancellationService.getEntertainerBookingCancellationReason(
      bookingId,
    );
  }
}
