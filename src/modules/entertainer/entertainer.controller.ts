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
  @ApiOperation({ summary: 'Create a entertainer' })
  @ApiResponse({
    status: 201,
    description: 'entertainer created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createEntertainerDto: CreateEntertainerDto, @Req() req) {
    const userId = req.user.userId;
    return this.entertainerService.create(createEntertainerDto, userId);
  }

  @Roles('findAll')
  @Get()
  @ApiOperation({ summary: 'Get all entertainers for the logged-in user' })
  findAll(@Request() req) {
    const { userId } = req.user;
    return this.entertainerService.findAll(userId);
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
    console.log(userId);
    return this.entertainerService.getDashboardStatistics(userId, query);
    return { message: 'returned Successfully' };
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a specific entertainer by ID' })
  // findOne(@Param('id') id: number, @Request() req) {
  //   return this.entertainerService.findOne(+id, req.user.userId);
  // }

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
  })
  remove(@Param('id') id: number, @Request() req) {
    return this.entertainerService.remove(+id, req.user.userId);
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
  getBooking(@Request() req) {
    const { userId } = req.user;
    console.log('userId', userId);
    return this.entertainerService.findAllBooking(userId);
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
  @Get('event/all/details')
  @Roles('findAll')
  getEventDetails(@Req() req) {
    const { userId } = req.user;
    return this.entertainerService.getEventDetails(userId);
  }
}
