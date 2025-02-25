import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/loginDto';
import { AdminUser } from './entities/AdminUser.entity';
import { CreateAdminUserDto } from './dto/CreateAdminUserDto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('admin')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly AdminService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @Post('createadminuser')
  async createuser(
    @Body() createAdminUserDto: CreateAdminUserDto,
  ): Promise<AdminUser> {
    return this.AdminService.createAdminUser(createAdminUserDto);
  }

  @ApiOperation({ summary: 'Log in and get a JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  async adminlogin(@Body() login: LoginDto): Promise<any> {
    return this.AdminService.adminlogin(login);
  }
}
