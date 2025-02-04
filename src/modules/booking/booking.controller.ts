import {
  Body,
  Controller,
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
import { ReqBookingDto } from './dto/request-booking.dto';

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('booking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({
    description: 'Enable Admin And Entertainer to review booking ',
  })
  @ApiResponse({ status: 200 })
  @Post('approve/:requestId')
  @Roles('findAll')
  approveChange(
    @Param('requestId') requestId: number,
    @Body() reqDto: ReqBookingDto,
  ) {
    return this.bookingService.approveChange(requestId, reqDto); // Admin id is hardcoded for now
  }
}
