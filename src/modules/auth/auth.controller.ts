import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Req,
  BadRequestException,
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
import { ResetPassword } from './dto/reset-password.dto';
import { verifyEmail } from './dto/verify-otp.dto';

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

  @ApiOperation({ summary: 'Send the OTP to the mail.' })
  @ApiResponse({ status: 200, description: 'Otp  sent Successfully.' })
  @HttpCode(200)
  @Post('send-otp')
  async sendOtp(@Body('email') email: string) {
    return this.authService.generateOtp(email);
  }

  @ApiOperation({ summary: 'Send the OTP to the mail.' })
  @ApiResponse({ status: 200, description: 'Otp  sent Successfully.' })
  @HttpCode(200)
  @Post('verify-otp')
  async verifyOtp(@Body() dto: verifyEmail) {
    return await this.authService.verifyOtp(dto);
  }

  @ApiOperation({ summary: 'Log in and get a JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Req() req) {
    const userAgent = req.headers['user-agent'] || '';

    return this.authService.login(loginDto, userAgent);
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

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(@Body('token') token: string) {
    return this.authService.logout(token);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() resetDto: ResetPassword) {
    const { token, newPassword } = resetDto;
    return this.authService.resetPassword(token, newPassword);
  }

  @ApiOperation({ summary: 'Send the OTP to the mail.' })
  @ApiResponse({ status: 200, description: 'Email verified Successfully.' })
  @HttpCode(200)
  @Post('verify-email')
  async verifyEmail(@Body() dto: verifyEmail) {
    return await this.authService.isUserVerified(dto);
  }
}
