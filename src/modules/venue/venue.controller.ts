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
import { UpdateVenueDto } from './dto/update-venue.dto';
import { BookingService } from '../booking/booking.service';
import { CreateBookingDto } from '../booking/dto/create-booking.dto';
import { ResponseDto } from '../booking/dto/booking-response-dto';
import { ChangeBooking } from './dto/change-booking.dto';
import { VenueLocationDto } from './dto/add-location.dto';
import { Data } from './dto/search-filter.dto';
import { WishlistDto } from './dto/wishlist.dto';
import { typeMap } from 'src/common/constants/media.constants';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from 'src/common/types/media.type';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { AddressDto } from './dto/address.dto';
import { PrimaryInfoDto } from './dto/primary-info.dto';
import { BookingQueryDto } from './dto/get-venue-booking.dto';

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
export class VenueController {
  constructor(
    private readonly venueService: VenueService,
    private readonly bookingService: BookingService,
  ) {}

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(
  //   AnyFilesInterceptor({
  //     fileFilter: (req, file, callback) => {
  //       // Check file type from typeMap
  //       const fileType = typeMap[file.fieldname];

  //       if (!fileType) {
  //         return callback(
  //           new BadRequestException({
  //             message: 'Invalid file field name',
  //             status: false,
  //           }),
  //           false,
  //         );
  //       }

  //       // Restrict video file size to 500MB
  //       if (fileType === 'video' && file.size > 500 * 1024 * 1024) {
  //         return callback(
  //           new BadRequestException({
  //             message: 'Video file size cannot exceed 500 MB',
  //             status: false,
  //           }),
  //           false,
  //         );
  //       }

  //       callback(null, true);
  //     },
  //   }),
  // )
  // // Only users with the 'venue' role can access this route
  // @ApiOperation({ summary: 'Create a venue' })
  // @ApiResponse({ status: 201, description: 'Venue created.', type: Venue })
  // @ApiResponse({ status: 403, description: 'Forbidden.' })
  // async createVenue(
  //   @Body() venueDto: CreateVenueDto,
  //   @Request() req,
  //   @UploadedFiles() files: Array<Express.Multer.File>,
  // ) {
  //   const { userId } = req.user;
  //   let uploadedFiles: UploadedFile[] = [];

  //   if (files.length > 0) {
  //     uploadedFiles = await Promise.all(
  //       files.map(async (file) => {
  //         const filePath = await uploadFile(file); // Wait for the upload
  //         return {
  //           url: filePath,
  //           name: file.originalname,
  //           type: typeMap[file.fieldname],
  //         };
  //       }),
  //     );
  //   }
  //   return this.venueService.createVenueWithMedia(
  //     venueDto,
  //     userId,
  //     uploadedFiles,
  //   );
  // }

  // @Post('add')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Create a venue' })
  // @ApiResponse({ status: 201, description: 'Venue created.', type: Venue })
  // @ApiResponse({ status: 403, description: 'Forbidden.' })
  // async create(@Body() venueDto: CreateVenueDto, @Request() req) {
  //   const { userId } = req.user;

  //   return this.venueService.create(venueDto, userId);
  // }

  // New Flow Signup under testing
  @Post()
  @UseGuards(JwtAuthGuard)
  async createVenue(@Body() dto: PrimaryInfoDto, @Request() req) {
    const { userId } = req.user;
    console.log(req.user, 'Inside Controller');
    return this.venueService.createVenue(userId, dto);
  }
  @Post('address')
  @UseGuards(JwtAuthGuard)
  async addVenueAddress(@Body() dto: AddressDto, @Request() req) {
    const { userId } = req.user;
    return this.venueService.updateVenueAddress(userId, dto);
  }
  @Post('media')
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: (req, file, callback) => {
        // Check file type from typeMap
        const fileType = typeMap[file.fieldname];

        if (!fileType) {
          return callback(
            new BadRequestException({
              message: 'Invalid file field name',
              status: false,
            }),
            false,
          );
        }

        // Restrict video file size to 500MB
        if (fileType === 'video' && file.size > 500 * 1024 * 1024) {
          return callback(
            new BadRequestException({
              message: 'Video file size cannot exceed 500 MB',
              status: false,
            }),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  @UseGuards(JwtAuthGuard)
  @Roles('findAll')
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
            type: typeMap[file.fieldname],
          };
        }),
      );
    }
    return this.venueService.uploadVenueMedia(userId, uploadedFiles);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll') // Restrict access to the 'venue' role
  @ApiOperation({ summary: 'Get all venues for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of venues.', type: Venue })
  async findAll(@Request() req) {
    const { userId } = req.user;
    return this.venueService.findAllByUser(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Get a single venue by ID' })
  @ApiResponse({ status: 200, description: 'Venue details.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { userId } = req.user;
    return this.venueService.findVenueLocation(id);
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

  // Api Status Working
  @ApiOperation({ summary: 'Update details of venue.' })
  @ApiResponse({
    status: 200,
    description: 'Venue updated Successfully .',
  })
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  updateVenue(@Body() UpdateVenueDto: UpdateVenueDto, @Request() req) {
    const { refId } = req.user;
    return this.venueService.updateVenue(refId, UpdateVenueDto);
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
    const { userId } = req.user;
    return this.bookingService.handleChangeRequest(dateTimeChangeDto, userId);
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

  // @ApiOperation({ summary: 'Add Venue Location' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Venue Location added Successfully',
  // })
  // @Roles('findAll')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Post('/location/add')
  // addLocation(@Body() locationDto: VenueLocationDto, @Request() req) {
  //   const { userId } = req.user;
  //   return this.venueService.addVenueLocation(userId, locationDto);
  // }

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
}
