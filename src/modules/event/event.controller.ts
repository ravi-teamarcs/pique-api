import { Body, Controller, Post } from '@nestjs/common';
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
  @Post()
  createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }
  // @Post()
  // updateEvent(@Body() createEventDto: CreateEventDto) {
  //   return this.eventService.createEvent(createEventDto);
  // }

  @ApiOperation({ summary: 'Send an  Event Reminder' })
  @ApiResponse({
    status: 200,
    description: 'Event  reminder  Sent  Sucessfully.',
  })
  @Post()
  sendEventReminder(@Body() createEventDto: CreateEventDto) {
    return this.eventService.sendEventReminder();
  }
}
