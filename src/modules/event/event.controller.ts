import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
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
    const { refId } = req.user;
    return this.eventService.getAllEvents(refId);
  }

  @Get(':id')
  @Roles('findAll')
  getEventById(@Req() req, @Param('id') id: number) {
    const { refId } = req.user;
    return this.eventService.getEventById(id, refId);
  }

  @ApiOperation({ summary: 'Update an Event' })
  @ApiResponse({
    status: 200,
    description: 'Event  updated Successfully.',
  })
  @Patch() // working fine
  @Roles('findAll')
  updateEvent(@Body() dto: UpdateEventDto, @Req() req) {
    const { refId } = req.user;
    return this.eventService.handleUpdateEvent(dto, refId);
  }
  @Delete(':id')
  @Roles('findAll')
  deleteEvent(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const { refId } = req.user;
    return this.eventService.deleteEvent(refId, Number(id));
  }

  // event.controller.ts
  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll') // adjust roles based on access level
  async updateEventStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status,
    @Req() req,
  ) {
    const { refId } = req.user; // assuming role is available in JWT
    return this.eventService.updateEventStatus(id, refId, status);
  }
}
