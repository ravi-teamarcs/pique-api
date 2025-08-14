import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SeriesService } from './series.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  create() {}

  @Get()
  getAllSeriesForVenue() {}

  @Get(':seriesId')
  getSeriesById(@Req() req, @Param('seriesId') seriesId: number) {}

  @Get('events/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  getUpcomingEvent(@Req() req) {
    const { refId } = req.user;
    return this.seriesService.getUpcomingEventForSeries(refId);
  }
}
