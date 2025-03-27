import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/roles.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';

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
  @Roles('super-admin')
  @Get('upcoming-events')
  upcomingEvents() {
    return this.dashboardService.upcomingEvents();
  }
}
