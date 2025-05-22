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
  Query,
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
export class EventController {
  constructor(private readonly eventService: EventService) {}
  @ApiOperation({ summary: 'Create a new Event' })
  @ApiResponse({
    status: 201,
    description: 'Event has been  Created Sucessfully.',
  })
  @Post() // Working Fine
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getAllEvent(
    @Req() req,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('status') status: string,
  ) {
    const { refId } = req.user;
    return this.eventService.getAllEvents(refId, page, pageSize);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  updateEvent(@Body() dto: UpdateEventDto, @Req() req) {
    const { refId } = req.user;
    return this.eventService.handleUpdateEvent(dto, refId);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  // Api to get Venue Details  for FeedBack Api
  @Get(':id/venue-details')
  getVenueDetailsByEventId(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.getVenueDetailsById(id);
  }
}
