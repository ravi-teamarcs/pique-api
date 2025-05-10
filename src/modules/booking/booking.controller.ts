import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('booking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}
//Change
  @ApiOperation({
    description: 'Enable Admin And Entertainer to review booking ',
  })
  @ApiResponse({ status: 200 })
  @Post('approve/:requestId')
  @HttpCode(200)
  @Roles('findAll')
  approveChange(
    @Param('requestId') requestId: number,
    @Body() reqDto: BookingReqResponse,
    @Request() req: any,
  ) {
    const { userId } = req.user;
    return this.bookingService.approveChange(requestId, reqDto, userId);
  }
}
