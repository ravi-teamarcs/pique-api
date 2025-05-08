import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { BookingQueryDto } from './dto/booking-query.dto';
import { AdminBookingDto } from './dto/admin-booking.dto';
import { AdminBookingResponseDto } from './dto/admin-booking-response.dto';
import { ModifyBookingDto } from './dto/modify.booking.dto';
import {
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from 'date-fns';

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('admin/booking')
@UseGuards(JwtAuthGuard, RolesGuardAdmin)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({
    description: 'Enable Admin To Track the Booking Request. ',
  })
  @ApiResponse({ status: 200 })
  @Get('request')
  @HttpCode(200)
  @Roles('super-admin')
  getAllBooking(@Query() query: BookingQueryDto) {
    return this.bookingService.getAllBookings(query);
  }

  @ApiOperation({
    description: 'Enable Admin To Track the Booking Request. ',
  })
  @ApiResponse({ status: 200, description: 'Booking fetched Successfully. ' })
  @Get(':id/request')
  @HttpCode(200)
  @Roles('super-admin')
  getAllBookingById(@Query() query: BookingQueryDto, @Param('id') userId) {
    return this.bookingService.getAllBookingById(query, Number(userId));
  }
  @ApiOperation({
    description: 'Enable Admin To Create booking on behalf of Venue. ',
  })
  @ApiResponse({ status: 200, description: 'Booking Created Successfully' })
  @Post('create')
  @HttpCode(201)
  @Roles('super-admin')
  createBooking(@Body() bookingdto: AdminBookingDto) {
    return this.bookingService.createBooking(bookingdto);
  }

  @ApiOperation({
    description: 'Enable Admin To Respond on the Behalf of the Venue . ',
  })
  @ApiResponse({
    status: 200,
    description: 'You have Successfully responded to the Booking',
  })
  @Patch('response')
  @HttpCode(200)
  @Roles('super-admin')
  bookingResponse(@Body() bookingdto: AdminBookingResponseDto) {
    return this.bookingService.bookingResponse(bookingdto);
  }

  // To get Booking Listing
  @Get('listing')
  @Roles('super-admin')
  getBookingListing(@Query('from') from: string, @Query('to') to: string) {
    const parsedFromDate = from ? new Date(from) : undefined;
    const parsedToDate = to ? new Date(to) : undefined;

    let finalFromDate: Date;
    let finalToDate: Date;

    if (parsedFromDate && parsedToDate) {
      finalFromDate = parsedFromDate;
      finalToDate = parsedToDate;
    } else {
      const today = new Date();

      // End of current month for finalToDate
      finalToDate = endOfMonth(today);

      // Start of the month 5 months ago for 6 full months including current
      finalFromDate = startOfMonth(subMonths(today, 5));
    }

    if (
      !(finalFromDate instanceof Date) ||
      isNaN(finalFromDate.getTime()) ||
      !(finalToDate instanceof Date) ||
      isNaN(finalToDate.getTime())
    ) {
      throw new Error('Invalid date format');
    }

    const formattedFromDate = format(finalFromDate, 'yyyy-MM-dd');
    const formattedToDate = format(finalToDate, 'yyyy-MM-dd');

    return this.bookingService.getBookingListing(
      formattedFromDate,
      formattedToDate,
    );
  }

  // To Reschedule Booking Request
  // @Patch('rescheduled')
  // @Roles('super-admin')
  // modifybooking(@Body() dto: ModifyBookingDto) {
  //   return this.bookingService.handleChangeRequest(dto);
  // }

  // To Delete  Booking Request
  @Delete(':id')
  @Roles('super-admin')
  removeBooking(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.removeBooking(id);
  }
}
