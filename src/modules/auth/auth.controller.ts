import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { LoginDto, RegisterDto } from './auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Log in and get a JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile from JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Returns user profile information.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return {
      message: 'Profile returned successfully',
      user: req.user,
      status: true,
    }; // Returns the user data from the JWT token
  }
}
