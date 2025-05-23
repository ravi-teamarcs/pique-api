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
} from '@nestjs/common';
import { EventService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './Entity/event.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';

@ApiTags('admin')
@Controller('admin/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('create')
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('getall')
  async findAll(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search: string = '',
  ) {
    return this.eventService.findAll({ page, pageSize, search });
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('eventbyid/:id')
  async findOne(@Param('id') id: number): Promise<Event> {
    return this.eventService.findOne(id);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Put('updatebyid/:id')
  async update(
    @Param('id') id: number,
    @Body() createEventDto: CreateEventDto,
  ): Promise<Event> {
    return this.eventService.update(id, createEventDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Delete('deletebyid:id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.eventService.remove(id);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('BookingsByEventId/:eventId')
  async findBooking(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<Booking[]> {
    return this.eventService.findBooking(eventId);
  }
}
