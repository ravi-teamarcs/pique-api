import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Request,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { UnavailableDateDto } from './dto/unavailable.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UnavailableDate } from './entities/unavailable.entity';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  //  New Code Acc to The Project(Availability)

  @UseGuards(JwtAuthGuard)
  @Roles('findAll')
  @Post()
  async setAvailabilityAndUnavailability(
    @Body('availability') availabilityDto: SetAvailabilityDto,
    @Body('unavailability') unavailabilityDto: UnavailableDateDto,
    @Req() req,
  ) {
    const { userId } = req.user;
    return this.availabilityService.setAvailabilityAndUnavailability(
      userId,
      availabilityDto,
      unavailabilityDto,
    );
  }

  @Roles('findAll')
  @Get()
  async getAvailabilityAndUnavailability(@Req() req) {
    const { userId } = req.user;
    return this.availabilityService.getAvailabilityAndUnavailability(userId);
  }
}
