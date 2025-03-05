import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/report')
export class ReportController {
    constructor(private readonly reportService: ReportService) { }


    @Roles('super-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Get('all')
    async getAllEvents() {
        return this.reportService.getAllEventData();
    }
}
