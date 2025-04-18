import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';
import { Roles } from '../auth/roles.decorator';
import { UpdateEventDto } from './dto/update-event.dto';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateEventDto } from './dto/create-event.dto';
@ApiTags('Events')
@Controller('event')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}
  @ApiOperation({ summary: 'Create a new Event' })
  @ApiResponse({
    status: 201,
    description: 'Event has been  Created Sucessfully.',
  })
  @Post() // Working Fine
  @Roles('findAll')
  createEvent(@Body() createEventDto: CreateEventDto, @Req() req) {
    return this.eventService.createEvent(createEventDto);
  }

  @ApiOperation({ summary: 'Get all Event for the Logged In User' })
  @ApiResponse({
    status: 200,
    description: 'Event fetched Successfully.',
  })
  @Get()
  @Roles('findAll')
  getAllEvent(@Req() req) {
    const id = 64;
    return this.eventService.getAllEvents(id);
  }

  @ApiOperation({ summary: 'Update an Event' })
  @ApiResponse({
    status: 200,
    description: 'Event  updated Successfully.',
  })
  @Patch() // working fine
  @Roles('findAll')
  updateEvent(@Body() updateEventDto: UpdateEventDto, @Req() req) {
    const { venueId, ...rest } = updateEventDto;
    return this.eventService.handleUpdateEvent(rest, venueId);
  }
  @Delete(':id')
  @Roles('findAll')
  deleteEvent(
    @Param('id') id: number,
    @Req() req,
    @Body('venueId') venueId: number,
  ) {
    return this.eventService.deleteEvent(venueId, Number(id));
  }
}
