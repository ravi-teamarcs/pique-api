import { Body, Controller, Post, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
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
    description: 'Event  Update  Sent  Sucessfully.',
  })
  @Put('update')
  updateEvent(@Body() createEventDto: CreateEventDto, @Req() req) {
    return this.eventService.handleUpdateEvent();
  }
}
