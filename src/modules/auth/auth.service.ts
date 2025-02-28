import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
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

@Injectable()
export class AuthService {
  constructor(
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

    // Sending Email to newly registerd User.
    const payload = {
      to: newUser.email,
      subject: 'Registered Successfully on Pique Api',
      // message: `Hello ${newUser.name}, You have successfully registered on Pique Api`,
      templateName: 'new-user.html',
      replacements: {
        userName: newUser.name,
      },
    };

    this.emailService.handleSendEmail(payload);
    return {
      message: 'User registered successfully',
      user: newUser,
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

  async handleForgotPassword(email: string, password: string) {
    // 1. Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (!existingUser) {
      throw new HttpException(
        { message: 'Email not found', error: 'Bad Request', status: false },
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      // 2. Hash the new password
      const newHashPassword = await bcrypt.hash(password, 10);

      // 3. Update the user's password
      const updateResult = await this.usersRepository.update(
        { id: existingUser.id },
        { password: newHashPassword },
      );

      // 4. Ensure update was successful
      if (updateResult.affected === 0) {
        throw new HttpException(
          { message: 'Password update failed', status: false },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return { message: 'Password updated successfully', status: true };
    } catch (error) {
      throw new HttpException(
        { message: 'An error occurred', error: error.message, status: false },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
