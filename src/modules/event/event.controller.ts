import {
  Body,
  Controller,
  Get,
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
  @Post()
  @Roles('findAll')
  createEvent(@Body() createEventDto: CreateEventDto, @Req() req) {
    const { userId } = req.user;
    return this.eventService.createEvent(createEventDto, userId);
  }

  @ApiOperation({ summary: 'Get all Event for the Logged In User' })
  @ApiResponse({
    status: 200,
    description: 'Event fetched Successfully.',
  })
  @Get()
  @Roles('findAll')
  getAllEvent(@Req() req) {
    const { userId } = req.user;
    return this.eventService.getAllEvents(userId);
  }

  @ApiOperation({ summary: 'Update an Event' })
  @ApiResponse({
    status: 200,
    description: 'Event  updated Successfully.',
  })
  @Patch()
  @Roles('findAll')
  updateEvent(@Body() updateEventDto: UpdateEventDto, @Req() req) {
    const { userId } = req.user;
    return this.eventService.handleUpdateEvent(updateEventDto, userId);
  }
}
