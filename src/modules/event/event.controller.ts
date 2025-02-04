import { Body, Controller, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Roles } from '../auth/roles.decorator';
import { UpdateEventDto } from './dto/update-event.dto';
@ApiTags('Events')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}
  @ApiOperation({ summary: 'Create a new Event' })
  @ApiResponse({
    status: 200,
    description: 'Event has been  Created Sucessfully.',
  })
  @Post('create')
  @Roles('findAll')
  createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }
  // @Post()
  // updateEvent(@Body() createEventDto: CreateEventDto) {
  //   return this.eventService.createEvent(createEventDto);
  // }

  @ApiOperation({ summary: 'Update an Event' })
  @ApiResponse({
    status: 200,
    description: 'Event  updated Successfully.',
  })
  @Patch('update')
  updateEvent(@Body() updateEventDto: UpdateEventDto, @Req() req) {
    const { userId } = req.user;
    return this.eventService.handleUpdateEvent(updateEventDto, userId);
  }
  
}
