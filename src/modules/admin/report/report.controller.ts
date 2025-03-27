import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Report } from './dto/report.dto';

@Controller('admin/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('all')
  async getAllEvents(@Query() query: Report) {
    // return this.reportService.getEventData();
    return this.reportService.getEventData(query);
  }
}
