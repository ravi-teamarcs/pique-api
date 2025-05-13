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
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateEntertainerAvailabilityDto } from './dto/entertainer-availability-dto';

@Controller('availabilities')
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get('/:id')
  async getEntertainerAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.availabilityService.getEntertainerAvailability(id, year, month);
  }
}
