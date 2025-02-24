import { Controller, Get, Post, Body, Param, Put, Delete, Req, Query, ParseIntPipe } from '@nestjs/common';
import { EventService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './Entity/event.entity';
import { ApiTags } from '@nestjs/swagger';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@ApiTags('admin')
@Controller('admin/events')
export class EventController {
    constructor(private readonly eventService: EventService) { }

    // Create a new event
    @Post('create')
    async create(@Body() createEventDto: CreateEventDto): Promise<Event> {
        return this.eventService.create(createEventDto);
    }

    // Get all events
    @Get('getall')

    async findAll(@Req() req,
        @Query('page') page: number = 1,
        @Query('pageSize') pageSize: number = 10,
        @Query('search') search: string = '',) {
        return this.eventService.findAll({ page, pageSize, search });
    }

    // Get a specific event by id
    @Get('eventbyid/:id')
    async findOne(@Param('id') id: number): Promise<Event> {
        return this.eventService.findOne(id);
    }

    // Update an event by id
    @Put('updatebyid/:id')
    async update(
        @Param('id') id: number,
        @Body() createEventDto: CreateEventDto,
    ): Promise<Event> {
        return this.eventService.update(id, createEventDto);
    }

    // Delete an event by id
    @Delete('deletebyid:id')
    async remove(@Param('id') id: number): Promise<void> {
        return this.eventService.remove(id);
    }


    // Get a specific event by id
    @Get('BookingsByEventId/:eventId')
    async findBooking(@Param('eventId', ParseIntPipe) eventId: number): Promise<Booking[]> {
        return this.eventService.findBooking(eventId);
    }

}
