import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Put,
  Query,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Venue } from './entities/venue.entity';
import { Roles } from '../auth/roles.decorator';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { SearchEntertainerDto } from './dto/serach-entertainer.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { BookingService } from '../booking/booking.service';
import { CreateBookingDto } from '../booking/dto/create-booking.dto';
import { VenueResponseDto } from '../booking/dto/booking-response-dto';

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenueController {
  constructor(
    private readonly venueService: VenueService,
    private readonly bookingService: BookingService,
  ) {}

  @Post()
  @Roles('findAll') // Only users with the 'venue' role can access this route
  @ApiOperation({ summary: 'Create a venue' })
  @ApiResponse({ status: 201, description: 'Venue created.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() createVenueDto: CreateVenueDto,
    @Request() req,
  ): Promise<Venue> {
    const userId = req.user.userId;
    return this.venueService.create(createVenueDto, userId);
  }

  @Get()
  @Roles('findAll') // Restrict access to the 'venue' role
  @ApiOperation({ summary: 'Get all venues for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of venues.', type: Venue })
  async findAll(@Request() req): Promise<Venue[]> {
    const userId = req.user.userId;
    return await this.venueService.findAllByUser(userId);
  }

  @Get(':id')
  @Roles('venue')
  @ApiOperation({ summary: 'Get a single venue by ID' })
  @ApiResponse({ status: 200, description: 'Venue details.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findOne(@Param('id') id: number, @Request() req): Promise<Venue> {
    const userId = req.user.userId;
    return this.venueService.findOneByUser(id, userId);
  }

  @Get('available/entertainer')
  @Roles('venue')
  @ApiOperation({ summary: 'Get all  the entertainers' })
  @ApiResponse({
    status: 200,
    description: 'Entertainers fetched successfully.',
    type: [Entertainer],
  })
  @ApiResponse({
    status: 404,
    description: 'Cannot get entertainers.',
  })
  getAllEntertainers() {
    return this.venueService.findAllEntertainers();
  }

  @Get('search/entertainers')
  @Roles('venue')
  @ApiOperation({ summary: 'Search entertainers by availability and type' })
  @ApiResponse({
    status: 200,
    description: 'Entertainers fetched successfully.',
    type: [Entertainer],
  })
  @ApiResponse({
    status: 404,
    description: 'Cannot get entertainers.',
  })
  search(@Query() query: SearchEntertainerDto) {
    return this.venueService.findByAvailabilityAndType(query);
  }

  // Booking Request   and create a new requet
  @ApiOperation({ summary: 'Create a new Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking Created Sucessfully.',
  })
  @Post('createbooking')
  @Roles('findAll')
  createBooking(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const userId = req.user.userId;
    return this.bookingService.createBooking(createBookingDto, userId);
  }

  @ApiOperation({ summary: 'Get list of all Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking list fetched Successfully .',
  })
  @Get('bookings/active')
  @Roles('venue')
  getAllBooking(@Request() req) {
    const userId = req.user.userId;
    console.log('controller got hit', userId);
    return this.venueService.findAllBooking(userId);
  }
  @ApiOperation({ summary: 'Get list of all Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking list fetched Successfully .',
  })
  @Put('booking/response')
  @Roles('findAll')
  bookingResponse(@Body() venueResponseDto: VenueResponseDto, @Request() req) {
    const role = req.user.role;
    venueResponseDto['statusDate'] = new Date();
    return this.bookingService.handleBookingResponse(role, venueResponseDto);
  }
}
