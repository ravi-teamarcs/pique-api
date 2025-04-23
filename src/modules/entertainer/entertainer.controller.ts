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
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
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
import { BookingService } from '../booking/booking.service';
import { ResponseDto } from '../booking/dto/booking-response-dto';
import { DashboardDto } from './dto/dashboard.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { typeMap } from 'src/common/constants/media.constants';
import { UploadedFile } from 'src/common/types/media.type';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { UpcomingEventDto } from './dto/upcoming-event.dto';
import { EventsByMonthDto } from './dto/get-events-bymonth.dto';
import { BookingQueryDto } from './dto/booking-query-dto';

@ApiTags('Entertainers')
@ApiBearerAuth()
@Controller('entertainers')
export class EntertainerController {
  constructor(
    private readonly entertainerService: EntertainerService,
    private readonly bookingService: BookingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a entertainer' })
  @ApiResponse({
    status: 201,
    description: 'entertainer created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() body: any, @Request() req) {
    const { step } = body;
    const { userId } = req.user;

    switch (step) {
      case 1:
        return this.entertainerService.saveBasicDetails(body, userId);
      case 2:
        return this.entertainerService.saveBio(body, userId);
      case 3:
        return this.entertainerService.vaccinationStatus(body, userId);
      case 4:
        return this.entertainerService.contactDetails(body, userId);
      case 5:
        return this.entertainerService.socialLinks(body, userId);
      case 6:
        return this.entertainerService.saveCategory(body, userId);
      case 7:
        return this.entertainerService.saveSpecificCategory(body, userId);
      case 8:
        return this.entertainerService.performanceRole(body, userId);
      case 9:
        return this.entertainerService.saveServices(body, userId);

      default:
        throw new BadRequestException({
          message: 'Invalid Step',
          status: false,
        });
    }
  }

  @Post('media')
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  async addMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    const { userId, refId } = req.user;

    let uploadedFiles: UploadedFile[] = [];

    const mimeTypeMap = {
      image: ['image/jpeg', 'image/png', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      headshot: ['image/jpeg', 'image/png'], // optional, if you want to distinguish
      event_headshot: ['image/jpeg', 'image/png'], // optional
    } as const;
    type FileType = keyof typeof mimeTypeMap;

    function getFileType(mimetype: string): FileType | null {
      for (const [key, mimeList] of Object.entries(mimeTypeMap) as [
        FileType,
        readonly string[],
      ][]) {
        if (mimeList.includes(mimetype)) {
          return key;
        }
      }
      return null;
    }

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
    return this.entertainerService.uploadMedia(userId, uploadedFiles);
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  async saveDetails(@Request() req) {
    const { userId } = req.user;
    return this.entertainerService.saveEntertainerDetails(userId);
  }
  // Update Entertainers Api
  @Patch()
  @UseGuards(JwtAuthGuard)
  updateEntertainer(@Body() body: any, @Request() req) {
    const { userId } = req.user;
  }
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Get all entertainers for the logged-in user' })
  findAll(@Request() req) {
    const { userId } = req.user;
    return this.entertainerService.findEntertainer(userId);
  }

  @ApiOperation({ summary: 'Get  entertainers dashboard stats' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer Dashboard statistics returned Successfully',
  })
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getdashboardStats(@Request() req, @Query() query: DashboardDto) {
    const { userId } = req.user;
    return this.entertainerService.getDashboardStatistics(userId, query);
  }

  // @Patch()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('findAll')
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
  // @ApiOperation({ summary: 'Update a specific entertainer by ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Entertainer updated sucessfully.',
  // })
  // async update(
  //   @Body() updateEntertainerDto: UpdateEntertainerDto,
  //   @UploadedFiles() files: Array<Express.Multer.File>,
  //   @Request() req,
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

  //   // return this.entertainerService.update(
  //   //   updateEntertainerDto,
  //   //   userId,
  //   //   uploadedFiles,
  //   // );
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific entertainer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer removed sucessfully.',
  })
  remove(@Param('id') id: number, @Request() req) {
    const { userId } = req.user;
    return this.entertainerService.remove(+id, userId);
  }

  // conflict in Routes

  @ApiOperation({ summary: 'Entertainer response to a Booking' })
  @ApiResponse({
    status: 200,
    description: 'Response registered Successfully',
  })
  @Patch('booking/response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  entertainerBookingResponse(@Body() resDto: ResponseDto, @Request() req) {
    const { role, userId } = req.user;
    return this.bookingService.handleBookingResponse(role, resDto, userId);
  }

  @Get('/booking/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Get all the booking of the  Entertainer' })
  @ApiResponse({
    status: 200,
    description: 'Booking fetched Successfully.',
  })
  getBooking(@Request() req, @Query() query: BookingQueryDto) {
    const { userId } = req.user;

    return this.entertainerService.findAllBooking(userId, query);
  }

  @Get('/booking/request/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Get all pending bookings of the Entertainer' })
  @ApiResponse({
    status: 200,
    description: 'Pending bookings fetched successfully.',
  })
  getPendingBookings(@Request() req) {
    const { userId } = req.user;
    return this.entertainerService.findPendingBookings(userId);
  }

  @ApiOperation({
    summary: 'Get  entertainers  categories and sub categories. ',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories fetched Successfully.',
  })
  @Get('categories/all')
  @Roles('findAll')
  async getCategories() {
    return this.entertainerService.getCategories();
  }

  @Get('categories/subcategories')
  @Roles('findAll')
  getSubCategories(@Query('id') id: number) {
    return this.entertainerService.getSubCategories(id);
  }

  @ApiOperation({
    summary: 'Get Event Details  linked with Booking',
  })
  @ApiResponse({
    status: 200,
    description: 'Events  fetched Successfully.',
  })
  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getEventDetails(@Req() req) {
    const { userId } = req.user;
    return this.entertainerService.getEventDetails(userId);
  }
  @Get('events/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  upcomingEvent(@Req() req, @Query() query: UpcomingEventDto) {
    const { userId } = req.user;
    return this.entertainerService.getUpcomingEvent(userId, query);
  }

  @Get('events/details/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getEventDetail(@Req() req, @Param('id') id: number) {
    const { userId } = req.user;
    return this.entertainerService.getEventDetailsById(userId, Number(id));
  }

  @Get('calendar/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getUpcomingEvents(@Request() req, @Query() query: EventsByMonthDto) {
    const { userId } = req.user;
    return this.entertainerService.getEventDetailsByMonth(userId, query);
  }
}
