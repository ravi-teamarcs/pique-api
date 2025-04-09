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
import { Category } from './entities/categories.entity';
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
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntertainerController {
  constructor(
    private readonly entertainerService: EntertainerService,
    private readonly bookingService: BookingService,
  ) {}

  @Roles('findAll') // Only users with the 'venue' role can access this route
  @Post()
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
  @ApiOperation({ summary: 'Create a entertainer' })
  @ApiResponse({
    status: 201,
    description: 'entertainer created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() dto: CreateEntertainerDto,
    @Req() req,
    @UploadedFiles() files: Array<Express.Multer.File>,
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
    return this.entertainerService.createEntertainerWithMedia(
      dto,
      userId,
      uploadedFiles,
    );
  }

  // @Roles('findAll')
  // @Post()
  // async create(@Body() dto: CreateEntertainerDto, @Req() req) {
  //   const { userId } = req.user;
  //   return this.entertainerService.create(dto, userId);
  // }

  @Roles('findAll')
  @Get()
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
  @Roles('findAll')
  @Get('dashboard')
  getdashboardStats(@Request() req, @Query() query: DashboardDto) {
    const { userId } = req.user;
    return this.entertainerService.getDashboardStatistics(userId, query);
  }

  @Patch(':id')
  @Roles('findAll')
  @ApiOperation({ summary: 'Update a specific entertainer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Entertainer updated sucessfully.',
  })
  update(
    @Param('id') id: number,
    @Body() updateEntertainerDto: UpdateEntertainerDto,
    @Request() req,
  ) {
    const { userId } = req.user;
    return this.entertainerService.update(+id, updateEntertainerDto, userId);
  }

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
  @Roles('findAll')
  entertainerBookingResponse(@Body() resDto: ResponseDto, @Request() req) {
    const { role, userId } = req.user;
    return this.bookingService.handleBookingResponse(role, resDto, userId);
  }

  @Get('/booking/request')
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
  @Roles('findAll')
  getEventDetails(@Req() req) {
    const { userId } = req.user;
    return this.entertainerService.getEventDetails(userId);
  }
  @Get('events/upcoming')
  @Roles('findAll')
  upcomingEvent(@Req() req, @Query() query: UpcomingEventDto) {
    const { userId } = req.user;
    return this.entertainerService.getUpcomingEvent(userId, query);
  }

  @Roles('findAll')
  @Get('calendar/events')
  async getUpcomingEvents(@Request() req, @Query() query: EventsByMonthDto) {
    const { userId } = req.user;
    return this.entertainerService.getEventDetailsByMonth(userId, query);
  }
}
