import { Controller, Post, Body, Get, Param, Request } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { UnavailableDateDto } from './dto/unavailable.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  // @Get(':entertainerId/calendar')
  // async getCalendarView(@Request() req, entertainerId: string) {
  //   return this.availabilityService.getCalendarData(entertainerId);
  // }

  @Post('weekly')
  setWeekly(@Request() req, @Body() dto: SetAvailabilityDto) {
    const { userId } = req.user;

    return this.availabilityService.setWeeklyAvailability(userId, dto.slots);
  }

  @Post('unavailable')
  setUnavailable(@Request() req, @Body() dto: UnavailableDateDto) {
    const { userId } = req.user;
    return this.availabilityService.setUnavailableDates(userId, dto);
  }

  //   @Post('custom/:userId')
  //   setCustom(@Param('userId') userId: number, @Body() body: any) {
  //     return this.availabilityService.setCustomAvailability(userId, body.custom);
  //   }

  //   @Get(':userId/date/:date')
  //   getAvailability(
  //     @Param('userId') userId: number,
  //     @Param('date') date: string,
  //   ) {
  //     return this.availabilityService.getAvailabilityForDate(userId, date);
  //   }
}
