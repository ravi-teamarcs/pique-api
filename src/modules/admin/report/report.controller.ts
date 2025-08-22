import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Report } from './dto/report.dto';
import { DownloadReport } from './dto/generate-report.dto';
import { Response } from 'express';

@Controller('admin/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}
}
