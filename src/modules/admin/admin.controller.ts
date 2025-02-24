import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';


import { CreateRoleCapabilityDto } from './auth/dto/create-role-capability.dto';
import { UpdateStatusDto } from './users/Dto/update-status.dto';
import { UpdateUserDto } from './users/Dto/update-user.dto';

@Controller()
export class AdminController {
  constructor(private readonly AdminService: AdminService) { }
  @Get()
  getHello(): string {
    return this.AdminService.getHello();
  }
}