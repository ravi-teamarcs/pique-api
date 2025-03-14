import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Request,
  RequestMapping,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateStatusDto } from './Dto/update-status.dto';
import { UpdateUserDto } from './Dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from './Entity/users.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './Dto/create-user.dto';
import { REQUEST } from '@nestjs/core';

@ApiTags('admin')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('all')
  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users.',
    type: [User],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing JWT token.',
  })
  async getAllUser(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search: string = '',
    @Query('role') role: string = '',
  ) {
    return this.userService.getAllUser({ page, pageSize, search, role });
  }

  @ApiBearerAuth()
  @Roles('super-admin')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @ Post('create')
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Request() req,
  ): Promise<any> {
    console.log('Req', req.user);
    return this.userService.createUser(createUserDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Patch('updateuserstatus')
  //@HttpCode(HttpStatus.OK) // Optional, ensure the response status is 200 OK
  async updateStatus(
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<string> {
    try {
      // Call the service method to update the status
      return await this.userService.updateStatus(updateStatusDto);
    } catch (error) {
      // Handle any errors that occur during the update
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Put('updateuser')
  async updateUser(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(updateUserDto);
  }
}
