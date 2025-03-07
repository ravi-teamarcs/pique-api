import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
import { NotificationService } from '../notification/notification.service';
import { Device } from 'src/common/types/auth.type';
import { EmailService } from '../Email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid email or password');
  }

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new HttpException(
        {
          message: 'Email Already in Use',
          error: 'Bad Request',
          status: false,
        },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const tokenPayload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
    const token = this.jwtService.sign(tokenPayload);
    // Sending Email to newly registerd User.
    const payload = {
      to: newUser.email,
      subject: 'Registered Successfully on Pique Api',

      templateName: 'new-user.html',
      replacements: {
        userName: newUser.name,
      },
    };

    // this.emailService.handleSendEmail(payload);
    return {
      message: 'User registered successfully',
      token,
      data: newUser,
      status: true,
    };
  }

  async login(loginDto: LoginDto, userAgent: string) {
    const { email, password, fcmToken } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpException(
        { message: 'Validation failed', error: 'Bad Request', status: false },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    // Checks for Profile Completion
    const completed = await this.isProfileCompleted(user);

    // Fcm Token
    const deviceType = this.detectDevice(userAgent);
    console.log('Device Type:', deviceType);
    if (deviceType.toLowerCase() == 'mobile' && fcmToken) {
      this.notificationService.storeFcmToken(user.id, fcmToken, deviceType);
    }
    return {
      message: 'Logged in Successfully',
      access_token: token,
      data: {
        user: {
          id: user.id,
          name: user.name,
          status: user.status,
          role: user.role,
          phone: user.phoneNumber,
          email: user.email,
          completed,
        },
      },
      status: true,
    };
  }

  async logout(fcmToken: string) {
    await this.notificationService.removeFcmToken(fcmToken);
    return { message: 'Logged out successfully.', status: true };
  }

  private async isProfileCompleted(user: User) {
    if (user.role === 'venue') {
      const venueCount = await this.venueRepository.count({
        where: { user: { id: user.id } },
      });
      return venueCount > 0;
    }

    if (user.role === 'entertainer') {
      const profileExists = await this.entertainerRepository.count({
        where: { user: { id: user.id } },
      });
      return profileExists > 0;
    }

    return false;
  }

  detectDevice(userAgent: string): Device {
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
      return 'mobile';
    }
    return 'web';
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user)
      throw new NotFoundException({ message: 'User not found', status: false });

    const resetToken = this.jwtService.sign(
      { email: user.email },
      {
        secret: this.configService.get<string>('PASSWORD_RESET_SECRET'),
        expiresIn: '10m',
      },
    );
    //  link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log('Reset Link:', resetToken);
    const payload = {
      to: user.email,
      subject: 'Password Reset',
      templateName: 'password-reset.html',
      replacements: {
        resetLink,
      },
    };
    // Send email
    await this.emailService.handleSendEmail(payload);

    return {
      message: 'Password reset link sent to your registered  email',
      status: true,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('PASSWORD_RESET_SECRET'),
      });

      const user = await this.usersRepository.findOne({
        where: { email: decoded.email },
      });

      if (!user)
        throw new NotFoundException({
          message: 'User not found',
          status: false,
        });

      // Hash new password and update user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.usersRepository.update(user.id, { password: hashedPassword });

      return { message: 'Password reset successful', status: true };
    } catch (error) {
      throw new BadRequestException({
        message: 'Invalid or expired token',
        status: false,
      });
    }
  }
}
