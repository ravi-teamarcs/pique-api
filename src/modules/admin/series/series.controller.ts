import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminSeriesService } from './series.service';
import { AddSeriesDto, UpdateSeriesDto } from './dto/add-series.dto';
import { SeriesQueryDto } from './dto/series-query.dto';
import { RemoveEvent } from './dto/remove-event.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';

@Controller('admin/series')
export class AdminSeriesController {
  constructor(private readonly seriesService: AdminSeriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  create(@Body() payload: AddSeriesDto, @Req() req) {
    return this.seriesService.createSeries(payload);
  }

  @Get('events/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  getUpcomingEvent(@Req() req) {
    return this.seriesService.getUpcomingEventForSeries();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  getAllSeries(@Req() req, @Query() query: SeriesQueryDto) {
    return this.seriesService.getAllSeries(query);
  }

  @Get(':seriesId')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  getSeriesById(@Req() req, @Param('seriesId') seriesId: number) {
    return this.seriesService.getSeriesById(seriesId);
  }

  @Delete('remove-event')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  removeEventfromSeries(@Body() payload: RemoveEvent) {
    const { eventId, seriesId } = payload;
    return this.seriesService.removeEventFromSeries(eventId, seriesId);
  }

  @Delete(':seriesId')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  removeSeriesAndEvent(
    @Param('seriesId', ParseIntPipe) seriesId: number,
    @Req() req,
  ) {
    return this.seriesService.removeSeriesAndEvents(seriesId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  updateSeries(@Body() payload: UpdateSeriesDto, @Req() req) {
    return this.seriesService.updateSeries(payload);
  }
}
