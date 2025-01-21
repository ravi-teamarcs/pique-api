import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
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
import { EntertainerService } from '../entertainer/entertainer.service';
import { SearchEntertainerDto } from './dto/search-entertainer.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenueController {
  constructor(
    private readonly venueService: VenueService,
    private readonly entertainerService: EntertainerService,
  ) {}

  @Post()
  @Roles('venue') // Only users with the 'venue' role can access this route
  @ApiOperation({ summary: 'Create a venue' })
  @ApiResponse({ status: 201, description: 'Venue created.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createVenueDto: CreateVenueDto, @Request() req) {
    const userId = req.user.userId;
    return this.venueService.create(createVenueDto, userId);
  }

  @Get()
  @Roles('venue') // Restrict access to the 'venue' role
  @ApiOperation({ summary: 'Get all venues for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of venues.', type: [Venue] })
  async findAll(@Request() req): Promise<Venue[]> {
    const userId = req.user.userId;
    return this.venueService.findAllByUser(userId);
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

  @Post('search-entertainers')
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
  search(@Body() searchEntertainerDto: SearchEntertainerDto) {
    return this.venueService.findByAvailabilityAndType(searchEntertainerDto);
  }

  // Booking Request   and create a new requet
  @ApiOperation({ summary: 'Create a new Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking Created Sucessfully.',
  })
  @Post('createbooking')
  @Roles('venue')
  createBooking(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const userId = req.user.userId;
    return this.venueService.createBooking(createBookingDto, userId);
  }
}
