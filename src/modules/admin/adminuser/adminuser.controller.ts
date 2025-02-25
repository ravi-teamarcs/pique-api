
import { AdminuserService } from './adminuser.service';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { CreateRoleCapabilityDto } from './dto/create-role-capability.dto';

@ApiTags('admin')
@Controller('admin/adminuser')
export class AdminuserController {
    constructor(private readonly AdminService: AdminuserService) { }
    @Get('capabilities')
    async getCapabilities() {
        return this.AdminService.getAllCapabilities();
    }
    @ApiOperation({ summary: 'Amdin User Created' })
    @ApiResponse({
        status: 200,
        description: 'Amdin User Created Sucessfully.',
    })

    @Get('roles')
    async getRoles() {
        return await this.AdminService.getRoles();
    }



    @Post('createrole')
    async createrole(@Body() body: CreateRoleCapabilityDto) {
        return this.AdminService.createrole(body.role, body.user, body.permissions);
    }
}
