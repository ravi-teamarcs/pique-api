import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/roles.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { EventsByMonthDto } from 'src/modules/entertainer/dto/get-events-bymonth.dto';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuardAdmin)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @ApiOperation({ summary: 'Fetch the dashboard Stats' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard Stats has been fetched Successfully.',
  })
  @Roles('super-admin')
  @Get('stats')
  getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
  @ApiOperation({ summary: 'Fetch upcoming events.' })
  @ApiResponse({
    status: 200,
    description: 'Events Fetched Successfully.',
  })
  @Get('upcoming-events')
  @Roles('super-admin')
  upcomingEvents() {
    return this.dashboardService.upcomingEvents();
  }

  //controller
  @Get('monthly-bookings')
  @Roles('super-admin')
  async getMonthlyStats() {
    const data = await this.dashboardService.getBookingsByMonth();
    return { data };
  }

  @Get('monthly-revenue')
  @Roles('super-admin')
  async getMonthlyRevenue() {
    const data = await this.dashboardService.getMonthlyRevenueStats();
    return { data };
  }

  @Get('calendar/events')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin', 'entertainer-admin')
  async getUpcomingEvents(@Query() query: EventsByMonthDto) {
    return this.dashboardService.getEventDetailsByMonth(query);
  }
}
