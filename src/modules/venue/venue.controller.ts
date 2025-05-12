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
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  Req,
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
import { UpdateVenueDto, UpdateVenueRequest } from './dto/update-venue.dto';
import { BookingService } from '../booking/booking.service';
import { CreateBookingDto } from '../booking/dto/create-booking.dto';
import { ResponseDto } from '../booking/dto/booking-response-dto';
import { ChangeBooking } from './dto/change-booking.dto';
import { VenueLocationDto } from './dto/add-location.dto';
import { Data } from './dto/search-filter.dto';
import { WishlistDto } from './dto/wishlist.dto';
import { typeMap } from 'src/common/constants/media.constants';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { getFileType, UploadedFile } from 'src/common/types/media.type';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { AddressDto } from './dto/address.dto';
import { PrimaryInfoDto } from './dto/primary-info.dto';
import { BookingQueryDto } from './dto/get-venue-booking.dto';
import { NeighbourhoodDto } from './dto/neighbourhood.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdatePrimaryInfoDto } from './dto/update-primary-info.dto';
import { UpdateNeighbourhoodDto } from '../admin/venue/Dto/update-neighbourhood';
import { CreateNeighbourhoodDto } from './dto/create-neighbourhood.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { EventsByMonthDto } from '../entertainer/dto/get-events-bymonth.dto';

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
export class VenueController {
  constructor(
    private readonly venueService: VenueService,
    private readonly bookingService: BookingService,
  ) {}

  // New Flow Signup under testing
  @Post()
  @UseGuards(JwtAuthGuard)
  async createVenue(@Body() dto: PrimaryInfoDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.createVenue(userId, dto);
  }

  @Post('address')
  @UseGuards(JwtAuthGuard)
  async addVenueAddress(@Body() dto: AddressDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.updateVenueAddress(userId, dto);
  }

  @Post('neighbourhood')
  @UseGuards(JwtAuthGuard)
  createNeighbourhood(@Body() dto: NeighbourhoodDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.createNeighbourhood(userId, dto);
  }
  @Patch('neighbourhood')
  @UseGuards(JwtAuthGuard)
  updateNeighbourhood(@Body() dto: UpdateNeighbourhoodDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.updateNeighbourhood(userId, dto);
  }

  @Post('media')
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  async addVenueMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    const { userId } = req.user;

    let uploadedFiles: UploadedFile[] = [];

    if (files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = await uploadFile(file); // Wait for the upload
          return {
            url: filePath,
            name: file.originalname,
            type: getFileType(file.mimetype),
          };
        }),
      );
    }
    return this.venueService.uploadVenueMedia(userId, uploadedFiles);
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  async saveDetails(@Request() req) {
    const { userId } = req.user;
    return this.venueService.saveVenueDetails(userId);
  }

  // Update Controllers

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updatePrimaryDetails(
    @Body() dto: UpdatePrimaryInfoDto,
    @Request() req,
  ) {
    const { userId } = req.user;
    return this.venueService.updatePrimaryDetails(userId, dto);
  }

  @Patch('address')
  @UseGuards(JwtAuthGuard)
  async updateVenueAddress(@Body() dto: UpdateAddressDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.updateSecondaryDetails(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('findAll') // Restrict access to the 'venue' role
  @ApiOperation({ summary: 'Get all venues for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of venues.', type: Venue })
  async findAll(@Request() req) {
    const { userId, refId } = req.user;
    return this.venueService.findAllByUser(userId, refId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Get a single venue by ID' })
  @ApiResponse({ status: 200, description: 'Venue details.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.venueService.findVenueById(id);
  }
  // Under Testing  ()
  @Get('search/entertainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  search(@Query() query: SearchEntertainerDto, @Request() req) {
    const { refId } = req.user;
    return this.venueService.findAllEntertainers(query, refId);
  }

  @Get('entertainer-profile/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Get Entertainer by Id' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer fetched successfully.',
    type: Entertainer,
  })
  @ApiResponse({
    status: 404,
    description: 'Entertainer not found.',
  })
  getEntertainerDetails(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { refId } = req.user;
    return this.venueService.findEntertainerDetails(Number(id), refId);
  }

  // Booking Request   and create a new requet
  @ApiOperation({ summary: 'Create a new Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking Created Sucessfully.',
  })
  @Post('createbooking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  createBooking(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const { refId } = req.user;
    return this.bookingService.createBooking(createBookingDto, refId);
  }

  // Need Improvement
  @ApiOperation({ summary: 'Get list of all Booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking list fetched Successfully .',
  })
  @Get('booking/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getAllBooking(@Request() req, @Query() query: BookingQueryDto) {
    const { refId } = req.user;
    return this.venueService.findAllBooking(refId, query);
  }

  // Not Touched
  @ApiOperation({ summary: 'Respond to a Booking' })
  @ApiResponse({
    status: 200,
    description: 'Successfully responded to booking .',
  })
  @Patch('booking/response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  bookingResponse(@Body() resDto: ResponseDto, @Request() req) {
    const { role, refId } = req.user;
    return this.bookingService.handleBookingResponse(role, resDto, refId);
  }

  // Multiple at once
  @Patch('booking/venue-response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  updateBookingStatus(@Body() dto: UpdateBookingStatusDto, @Request() req) {
    const { refId } = req.user;
    return this.bookingService.updateBookingStatus(dto, refId);
  }

  // Api Status Working
  @ApiOperation({ summary: 'Update details of venue.' })
  @ApiResponse({
    status: 200,
    description: 'Venue updated Successfully .',
  })
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @UseInterceptors(AnyFilesInterceptor())
  async updateVenueDetails(
    @Body() dto: UpdateVenueRequest,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req,
  ) {
    const { refId } = req.user;

    let uploadedFiles: UploadedFile[] = [];
    if (files && files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = await uploadFile(file);
          const type = getFileType(file.mimetype); // Wait for the upload
          return {
            url: filePath,
            name: file.originalname,
            type,
          };
        }),
      );
    }
    return this.venueService.updateVenueWithMedia(refId, dto, uploadedFiles);
  }

  // Working
  @ApiOperation({ summary: 'Remove venue By id. ' })
  @ApiResponse({
    status: 200,
    description: 'Venue removed Successfully .',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.venueService.handleRemoveVenue(Number(id));
  }
  // Need More Working
  @Post('request-change')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  requestChange(@Body() dateTimeChangeDto: ChangeBooking, @Request() req) {
    const { refId } = req.user;
    return this.bookingService.handleChangeRequest(dateTimeChangeDto, refId);
  }

  // Working
  @ApiOperation({ summary: 'Get search suggestions based on category' })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions fetched successfully.',
  })
  @Get('search/suggestion/cat')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getSuggestions(@Query('q') query: string) {
    return this.venueService.getSearchSuggestions(query);
  }

  @ApiOperation({ summary: 'Get search Filters.' })
  @ApiResponse({
    status: 200,
    description: 'Filters Fetched Successfully.',
  })

  // Working
  @Get('search/filters')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getAllCategory(@Query() query: Data) {
    return this.venueService.getAllCategories(query);
  }

  // Working
  @Get('search/category/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getEntertainerByCategory(@Param('id') cid: number) {
    return this.venueService.getAllEntertainersByCategory(cid);
  }

  @ApiOperation({ summary: 'Add Entertainer to the whishlist' })
  @ApiResponse({
    status: 201,
    description: 'Entertainer added to wishlist.',
  })
  @Roles('findAll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/toogle/wishlist')
  toggleWishList(@Body() wishDto: WishlistDto, @Request() req) {
    const { refId } = req.user;
    return this.venueService.toggleWishlist(refId, wishDto);
  }

  // Working Fine
  @ApiOperation({ summary: 'Get Whishlist' })
  @ApiResponse({
    status: 200,
    description: 'WishList fetched Successfully',
  })
  @Roles('findAll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/entertainers/wishlist')
  getWishList(@Request() req) {
    const { refId } = req.user;
    return this.venueService.getWishlist(refId);
  }

  @ApiOperation({ summary: 'Get entertainer roles.' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer roles fetched Successfully.',
  })
  @Roles('findAll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('entertainer/roles')
  getRoles() {
    return {
      message: 'Role returned Successfully',
      status: true,
      data: [
        { role: 'soloist' },
        { role: 'duo' },
        { role: 'trio' },
        { role: 'ensemble' },
      ],
    };
  }

  @Roles('findAll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('entertainer/wishlist/:id')
  removeFromWishlist(@Request() req, @Param('id') id: number) {
    const { refId } = req.user;
    return this.venueService.removeFromWishlist(Number(id), refId);
  }

  // Neighbourhood logic Lies here
  @Get('neighbourhoods/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getNeighbourhoods(@Request() req) {
    const { refId } = req.user;
    return this.venueService.getVenueNeighbourhoods(refId);
  }

  @Get('neighbourhood/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getNeighbourhood(@Param('id', ParseIntPipe) id: number) {
    return this.venueService.neighbourhoodById(id);
  }

  @Post('neighbourhood/add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  create(@Body() dto: CreateNeighbourhoodDto, @Request() req) {
    const { refId } = req.user;
    return this.venueService.create(dto, refId);
  }

  @Patch('neighbourhood/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNeighbourhoodDto,
  ) {
    return this.venueService.update(id, dto);
  }

  @Delete('neighbourhood/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  removeNeighbourhood(@Param('id', ParseIntPipe) id: number) {
    return this.venueService.removeNeighbourhood(id);
  }

  @Get('calendar/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getUpcomingEvents(@Request() req, @Query() query: EventsByMonthDto) {
    const { refId } = req.user;
    return this.venueService.getEventDetailsByMonth(refId, query);
  }
}
