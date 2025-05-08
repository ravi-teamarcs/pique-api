import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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
import { Otp } from '../users/entities/otps.entity';
import { verifyEmail } from './dto/verify-otp.dto';

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
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
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
      status: newUser.status,
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

    this.emailService.handleSendEmail(payload);
    return {
      message: 'User registered successfully',
      token,
      data: newUser,
      status: true,
    };
  }

  // Needs Testing
  async generateOtp(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
    });
    if (user) {
      throw new BadRequestException({
        message: 'Email Already Taken',
        error: 'Bad Request',
        status: false,
      });
    }
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      const existingOtp = await this.otpRepository.findOne({
        where: { email },
      });

      if (existingOtp) {
        // Update existing OTP
        existingOtp.otp = otpCode;
        existingOtp.expiresAt = new Date(Date.now() + 2 * 60000); // Extend expiry
        await this.otpRepository.save(existingOtp);
      } else {
        // Create new OTP record
        const newOtp = this.otpRepository.create({
          email,
          otp: otpCode,
          expiresAt: new Date(Date.now() + 2 * 60000),
        });
        await this.otpRepository.save(newOtp);
      }
      const payload = {
        to: email,
        subject: 'Email verification   ',
        templateName: 'email-verification.html',
        replacements: {
          otp: otpCode,
        },
      };
      // send via email
      await this.emailService.handleSendEmail(payload);
      return {
        message: 'Otp Sent Successfully to the entered  email.',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error in send otp',
        error: error.message,
        status: false,
      });
    }
  }

  // Modified(Working)
  async verifyOtp(dto: verifyEmail) {
    const { email, otp } = dto;

    // Needs Removal only for bypass
    if (otp === '000000') {
      return { message: 'Email verified Successfully', status: true };
    }

    const otpRecord = await this.otpRepository.findOne({ where: { email } });
    if (!otpRecord)
      throw new BadRequestException({ message: 'OTP expired or not found' });
    if (otpRecord.otp !== otp)
      throw new BadRequestException({
        message: 'Invalid Otp , Please check again and enter.',
        status: false,
      });

    if (new Date(otpRecord.expiresAt) < new Date())
      throw new BadRequestException({ message: 'OTP expired', status: false });

    //  No need

    // const user = await this.usersRepository.findOne({
    //   where: { email, createdByAdmin: true },
    // });
    // if (user) {
    //   await this.usersRepository.update(
    //     { id: user.id },
    //     { isVerified: true, status: 'active' },
    //   );
    // }
    await this.otpRepository.delete({ email });
    return { message: 'Email verified Successfully', status: true };
  }

  async login(loginDto: LoginDto, userAgent: string) {
    const { email, password, fcmToken } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpException(
        {
          message: 'Incorrect Email or Password',
          error: 'Bad Request',
          status: false,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    // Getting Original Id (Venue or Entertainer)
    const { originalId, profileStep, isProfileComplete } =
      await this.getOriginalIdFromUser(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      refId: originalId,
    };

    const token = this.jwtService.sign(payload);

    const deviceType = this.detectDevice(userAgent);

    this.notificationService.storeFcmToken(user.id, fcmToken, deviceType);

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
          isVerified: user.isVerified,
          completed: isProfileComplete,
          profileStep,
        },
      },
      status: true,
    };
  }

  async logout(fcmToken: string) {
    await this.notificationService.removeFcmToken(fcmToken);
    return { message: 'Logged out successfully.', status: true };
  }

  detectDevice(userAgent: string): Device {
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
      return 'mobile';
    }
    return 'web';
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email, isVerified: true },
    });

    if (!user)
      throw new NotFoundException({
        message: 'User not found or Email not verified',
        status: false,
      });

    const resetToken = this.jwtService.sign(
      { email: user.email },
      {
        secret: this.configService.get<string>('PASSWORD_RESET_SECRET'),
        expiresIn: '10m',
      },
    );
    //  link
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

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

  private async getOriginalIdFromUser(user: User) {
    const { role, id } = user;

    if (role === 'venue') {
      const venue = await this.venueRepository.findOne({
        where: { user: { id } },
      });

      return {
        profileStep: venue?.profileStep ?? 0,
        isProfileComplete: venue?.isProfileComplete ?? false,
        originalId: venue ? Number(venue.id) : null,
      };
    }

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id } },
    });
    return {
      profileStep: entertainer?.profileStep ?? 0,
      isProfileComplete: entertainer?.isProfileComplete ?? false,
      originalId: entertainer ? Number(entertainer.id) : null,
    };
  }
}
