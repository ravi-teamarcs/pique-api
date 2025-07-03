import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookingReqResponse } from './dto/request-booking.dto';
import { deleteFileFromServer } from 'src/common/middlewares/multer.middleware';

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('booking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('by-event/:eventId')
  @Roles('findAll')
  async getBookingsByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Request() req,
  ) {
    const { refId } = req.user;
    return this.bookingService.entertainerBookingDetailsByEvent(eventId, refId);
  }

  @Get('entertainers/details/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getDetailsBasedOnEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Request() req,
  ) {
    const { refId } = req.user;
    return this.bookingService.getEntertainerDetailsPerEvent(eventId, refId);
  }

  // Temporary route for testing file deletion
  // @Post('test-route')
  // @Roles('findAll')
  // async tetstingRoute(@Body('url') url: string) {
  //   return deleteFileFromServer(url);
  // }
}
