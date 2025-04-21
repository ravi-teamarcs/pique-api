import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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

  @Patch('details')
  @HttpCode(200)
  @Roles('super-admin')
  modifyBooking(@Body() dto: ModifyBookingDto) {
    return this.bookingService.modifyBooking(dto);
  }
}
