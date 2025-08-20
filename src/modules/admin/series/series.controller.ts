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
import { SeriesService } from './series.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { SeriesQueryDto } from './dto/series-query.dto';
import { RemoveEvent } from './dto/remove-event.dto';
import { AddSeriesDto, UpdateSeriesDto } from './dto/add-series.dto';

@Controller('admin/series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('findAll')
  create(@Body() payload: AddSeriesDto, @Req() req) {
    return this.seriesService.createSeries(payload);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('findAll')
  getAllSeries(@Req() req, @Query() query: SeriesQueryDto) {
    return this.seriesService.getAllSeries(query);
  }

  // @Get('events/upcoming')
  // @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  // @Roles('findAll')
  // getUpcomingEvent(@Req() req) {
  //   const { refId } = req.user;
  //   return this.seriesService.getUpcomingEventForSeries(refId);
  // }

  @Get(':seriesId')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('findAll')
  getSeriesById(@Req() req, @Param('seriesId') seriesId: number) {
    const { ref: venueId } = req.user;
    return this.seriesService.getSeriesById(seriesId, venueId);
  }

  // @Post('/event')
  // @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  // @Roles('findAll')
  // addEventToSeries(@Body() dto: SeriesEventDto, @Req() req) {
  //   const { ref: venueId } = req.user;
  //   return this.seriesService.addNewEventToSeries(dto);
  // }

  @Delete('remove-event')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('findAll')
  removeEventfromSeries(@Body() payload: RemoveEvent) {
    const { eventId, seriesId } = payload;
    return this.seriesService.removeEventFromSeries(eventId, seriesId);
  }

  @Delete(':seriesId')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('findAll')
  removeSeriesAndEvent(
    @Param('seriesId', ParseIntPipe) seriesId: number,
    @Req() req,
  ) {
    const { refId } = req.user;
    return this.seriesService.removeSeriesAndEvents(seriesId, refId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('findAll')
  updateSeries(@Body() payload: UpdateSeriesDto, @Req() req) {
    return this.seriesService.updateSeries(payload);
   
  }
}
