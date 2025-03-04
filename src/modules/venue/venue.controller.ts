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
  Delete,
  Patch,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
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
import { ResponseDto } from '../booking/dto/booking-response-dto';
import { ChangeBooking } from './dto/change-booking.dto';
import { VenueLocationDto } from './dto/add-location.dto';

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
  async create(@Body() venueDto: CreateVenueDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.create(venueDto, userId);
  }

  @Get()
  @Roles('findAll') // Restrict access to the 'venue' role
  @ApiOperation({ summary: 'Get all venues for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of venues.', type: Venue })
  async findAll(@Request() req) {
    const { userId } = req.user;
    return this.venueService.findAllByUser(userId);
  }

  @Get(':id')
  @Roles('findAll')
  @ApiOperation({ summary: 'Get a single venue by ID' })
  @ApiResponse({ status: 200, description: 'Venue details.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { userId } = req.user;

    return this.venueService.findVenueLocation(id, userId);
  }

  @Get('search/entertainers')
  @Roles('findAll')
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
    return this.venueService.findAllEntertainers(query);
  }

  @Get('entertainer-profile/:id')
  @Roles('findAll')
  @ApiOperation({ summary: 'Get Entertainer by Id' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer fetched successfully.',
    type: Entertainer,
  })
  @ApiResponse({
    status: 404,
    description: 'Cannot get entertainers.',
  })
  GetEntertainerDetails(@Param('id', ParseIntPipe) userId: number) {
    return this.venueService.findEntertainerDetails(Number(userId));
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
    const { userId } = req.user;
    return this.bookingService.createBooking(createBookingDto, userId);
  }

  @ApiOperation({ summary: 'Get list of all Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking list fetched Successfully .',
  })
  @Get('booking/request')
  @Roles('findAll')
  getAllBooking(@Request() req) {
    const userId = req.user.userId;

    return this.venueService.findAllBooking(userId);
  }
  @ApiOperation({ summary: 'Get list of all Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking list fetched Successfully .',
  })
  @Patch('booking/response')
  @Roles('findAll')
  bookingResponse(@Body() resDto: ResponseDto, @Request() req) {
    const { role, userId } = req.user;
    // venueResponseDto['statusDate'] = new Date();
    return this.bookingService.handleBookingResponse(role, resDto, userId);
  }

  @ApiOperation({ summary: 'Update details of venue.' })
  @ApiResponse({
    status: 200,
    description: 'Venue updated Successfully .',
  })
  @Put('update')
  @Roles('findAll')
  updateVenue(@Body() UpdateVenueDto: UpdateVenueDto, @Request() req) {
    const userId = req.user.userId;
    return this.venueService.handleUpdateVenueDetails(UpdateVenueDto, userId);
  }
  @ApiOperation({ summary: 'Remove venue By id. ' })
  @ApiResponse({
    status: 200,
    description: 'Venue removed Successfully .',
  })
  @Delete(':id')
  @Roles('findAll')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.userId;
    return this.venueService.handleRemoveVenue(Number(id), userId);
  }

  @Post('request-change')
  @Roles('findAll')
  requestChange(@Body() dateTimeChangeDto: ChangeBooking, @Request() req) {
    const userId = req.user.userId;

    return this.bookingService.handleChangeRequest(dateTimeChangeDto, userId);
  }

  @ApiOperation({ summary: 'Get search suggestions based on category' })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions fetched successfully.',
  })
  @Get('search/suggestion/cat')
  @Roles('findAll')
  async getSuggestions(@Query('q') query: string) {
    return this.venueService.getSearchSuggestions(query);
  }
  @Get('search/category/:id')
  @Roles('findAll')
  getEntertainerByCategory(@Param('id') cid: number) {
    return this.venueService.getAllEntertainersByCategory(cid);
  }

  @Post('/location/add')
  @Roles('findAll')
  addLocation(@Body() locationDto: VenueLocationDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.addVenueLocation(userId, locationDto);
  }
}
