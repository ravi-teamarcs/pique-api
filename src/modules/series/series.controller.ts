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
import { SeriesService } from './series.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SeriesDto } from './dto/series.dto';
import { SeriesEventDto } from './dto/add-event.dto';
import { AddExistingEventToSeriesDto } from './dto/existing-event.dto';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  create(@Body() payload: SeriesDto, @Req() req) {
    const { refId } = req.user;
    payload['venueId'] = refId;
    return this.seriesService.createSeries(payload);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getAllSeriesForVenue(@Req() req) {
    const { refId: venueId } = req.user;
    return this.seriesService.getAllSeriesOfVenue(venueId);
  }

  @Get('events/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getUpcomingEvent(@Req() req) {
    const { refId } = req.user;
    return this.seriesService.getUpcomingEventForSeries(refId);
  }

  @Get(':seriesId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getSeriesById(@Req() req, @Param('seriesId') seriesId: number) {
    const { ref: venueId } = req.user;
    return this.seriesService.getSeriesById(seriesId, venueId);
  }

  @Post('/event')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  addEventToSeries(@Body() dto: SeriesEventDto, @Req() req) {
    const { ref: venueId } = req.user;
    return this.seriesService.addNewEventToSeries(dto);
  }

  @Patch('/existing-event')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  addExistingEventToSeries(
    @Body() dto: AddExistingEventToSeriesDto,
    @Req() req,
  ) {
    const { refId: venueId } = req.user;
    const { eventId, seriesId } = dto;
    return this.seriesService.addExistingEventToSeries(
      eventId,
      seriesId,
      venueId,
    );
  }

  @Delete()
  removeEventfromSeries() {}
}
