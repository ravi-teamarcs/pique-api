import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { User } from './entities/users.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user
   */
  //   @Post()
  //   @ApiOperation({ summary: 'Create a new user' })
  //   @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: User })
  //   @ApiResponse({ status: 400, description: 'Invalid input.' })
  //   async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
  //     try {
  //       return await this.usersService.create(createUserDto);
  //     } catch (error) {
  //       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  //     }
  //   }

  /**
   * Get all users
   */
  // @Get()
  // @Roles('findAll')
  // @ApiBearerAuth() // Swagger UI will ask for the Bearer token
  // @ApiOperation({ summary: 'Get all users' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Returns a list of all users.',
  //   type: [User],
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: 'Unauthorized. Invalid or missing JWT token.',
  // })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // async getAllUsers(@Request() req): Promise<User[]> {
  //   return this.usersService.findAll();
  // }

  /**
   * Get a user by ID
   */
  @Get(':id')
  // @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Returns the user.', type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUserById(@Param('id') id: number): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  /**
   * Update a user by ID
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'The user has been updated.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    if (!updatedUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return updatedUser;
  }

  /**
   * Delete a user by ID
   */
  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete user by ID' })
  // @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  // @ApiResponse({ status: 200, description: 'The user has been deleted.' })
  // @ApiResponse({ status: 404, description: 'User not found.' })
  // async deleteUser(@Param('id') id: number): Promise<{ message: string }> {
  //   const deleted = await this.usersService.delete(id);
  //   if (!deleted) {
  //     throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  //   }
  //   return { message: 'User successfully deleted' };
  // }

  @Get('loggedIn/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Fetch the current user Profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile fetched successfully',
  })
  getUserprofile(@Req() req) {
    const { userId, role } = req.user;

    console.log(req.user);

    return this.usersService.handleGetUserProfile(userId, role);
  }
}
