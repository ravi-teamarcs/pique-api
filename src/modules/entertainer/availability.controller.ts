import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Request,
  UseGuards,
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

  @UseGuards(JwtAuthGuard)
  @Roles('findAll')
  @Post('create')
  async create(@Body() dto: CreateEntertainerAvailabilityDto, @Request() req) {
    const { refId } = req.user;
    dto.entertainer_id = refId;
    return this.availabilityService.create(dto);
  }

  @Get('get/:entertainer_id')
  async getByEntertainerId(@Param('entertainer_id') id: number) {
    return this.availabilityService.findByEntertainerId(+id);
  }
}
