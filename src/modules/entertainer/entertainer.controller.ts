import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { EntertainerService } from './entertainer.service';
import { CreateEntertainerDto } from './dto/create-entertainer.dto';
import { UpdateEntertainerDto } from './dto/update-entertainer.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Entertainer } from './entities/entertainer.entity';
import { Roles } from '../auth/roles.decorator';
// import { Booking } from '../booking/entities/booking.entity';
import { BookingResponseDto } from './dto/booking-response.dto';


@ApiTags('Entertainers')
@ApiBearerAuth()
@Controller('entertainers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntertainerController {
  constructor(private readonly entertainerService: EntertainerService) {}

  @Post()
  @Roles('entertainer') // Only users with the 'venue' role can access this route
  @ApiOperation({ summary: 'Create a entertainer' })
  @ApiResponse({
    status: 201,
    description: 'entertainer created.',
    type: Entertainer,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createEntertainerDto: CreateEntertainerDto , @Req() req) {
    const userId = req.user.userId;
    return this.entertainerService.create(createEntertainerDto , userId);
  }
  //   create(@Body() createEntertainerDto: CreateEntertainerDto, @Request() req) {
  //     console.log('---', req.user);
  //     return this.entertainerService.create(createEntertainerDto, req.user.id);
  //   }

  @Get()
  @Roles('entertainer')
  @ApiOperation({ summary: 'Get all entertainers for the logged-in user' })
  findAll(@Request() req) {
    return this.entertainerService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific entertainer by ID' })
  findOne(@Param('id') id: number, @Request() req) {
    return this.entertainerService.findOne(+id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific entertainer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer updated sucessfully.',
    type: Entertainer,
  })
  update(
    @Param('id') id: number,
    @Body() updateEntertainerDto: UpdateEntertainerDto,
    @Request() req,
  ) {
    return this.entertainerService.update(
      +id,
      updateEntertainerDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific entertainer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer removed sucessfully.',
    type: Entertainer,
  })
  remove(@Param('id') id: number, @Request() req) {
    return this.entertainerService.remove(+id, req.user.userId);
  }

  // conflict in Rotes

  // @ApiOperation({ summary: 'Entertainer response to a Booking' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Response registered Successfully',
  // })
  // @Put('booking-response')
  // @Roles('entertainer')
  // entertainerBookingResponse(
  //   @Body() bookingResponseDto: BookingResponseDto,
  //   @Request() req,
  // ) {
  //   const userId = req.user.userId;
  //   return this.entertainerService.handleBookingResponse(bookingResponseDto);
  // }

  //   @Get('/booking/request')
//   @Roles('entertainer')
//   @ApiOperation({ summary: 'Get all the booking of the  Entertainer' })
//   @ApiResponse({
//     status: 200,
//     description: 'Booking fetched Successfully.',
//     // type: [Booking],
//   })
//   getBooking(@Request() req) {
//     const userId = req.user.userId;
//     console.log('userId', userId);
//     return this.entertainerService.findAllBooking(userId);
//   }
}
