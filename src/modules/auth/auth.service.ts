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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
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

    return {
      message: 'User registered successfully',
      user: newUser,
      status: true,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpException(
        { message: 'Validation failed', error: 'Bad Request', status: false },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const completed = await this.isProfileCompleted(user);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

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

    // Add venueCount dynamically if the user is a venue
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
}
