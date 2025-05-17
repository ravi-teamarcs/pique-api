import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Request,
  UseGuards,
  Query,
  ParseIntPipe,
  Put,
  Req,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateEntertainerAvailabilityDto } from './dto/entertainer-availability-dto';
import { UpdateAvailabilityDto } from './dto/update-entertainer-availability.dto';
import { RolesGuard } from '../auth/roles.guard';
import { EntertainerAvailabilityDto } from '../admin/entertainer/Dto/entertainer-availability.dto';

@Controller('availabilities')
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async getAvailability(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Request() req,
  ) {
    const { refId } = req.user;
    return this.availabilityService.getEntertainerAvailability(
      refId,
      year,
      month,
    );
  }
  @Get('/:id')
  async getEntertainerAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.availabilityService.getEntertainerAvailability(id, year, month);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async createAvailability(
    @Body() dto: EntertainerAvailabilityDto,
    @Req() req,
  ) {
    const { refId } = req.user;
    dto['entertainer_id'] = refId;
    return this.availabilityService.saveEntertainerAvailability(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  async updateEntertainerAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.updateEntertainerAvailability(id, dto);
  }
}
