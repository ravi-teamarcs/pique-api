import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  Query,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { EventService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './entities/event.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { GetEventDto } from './dto/get-event.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { typeMap } from 'src/common/constants/media.constants';
import { UploadedFile } from 'src/common/types/media.type';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { EventsQueryDto } from './dto/query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';

@ApiTags('admin')
@Controller('admin/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // Event Created
  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('create')
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }

  @Get('getall')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  async findAll(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search: string = '',
    @Query('status')
    status:
      | 'unpublished'
      | 'scheduled'
      | 'confirmed'
      | 'cancelled'
      | 'completed'
      | '',
  ) {
    return this.eventService.findAll({ page, pageSize, search, status });
  }

  @Get('eventbyid/:id')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  async findOne(@Param('id') id: number): Promise<Event> {
    return this.eventService.findOne(id);
  }

  @Get('filter')
  async filterEventsByMonthAndYear(@Query() query: FilterEventDto) {
    return await this.eventService.filterEventsByMonthAndYear(query);
  }

  @Get('booking/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  async findBooking(@Param('eventId') eventId: number) {
    return this.eventService.findBookings(Number(eventId));
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Put('updatebyid/:id')
  async update(@Param('id') id: number, @Body() dto: UpdateEventDto) {
    return this.eventService.update(Number(id), dto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Delete('deletebyid/:id')
  async remove(@Param('id') id: number) {
    return this.eventService.remove(Number(id));
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('upcoming')
  async getUpcomingEvent(@Query() query: GetEventDto) {
    return this.eventService.getUpcomingEvent(query);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('calendar')
  async getEventCalendar(@Query() query: EventsQueryDto) {
    return this.eventService.getEventDetailsByMonth(query);
  }

  @Put()
  async updateEventStatus(
    @Param('eventId', ParseIntPipe) eventId: number,
    status: 'published' | 'unpublished' | 'completed',
  ) {
    return this.eventService.updateEventStatus(eventId, status);
  }
}
