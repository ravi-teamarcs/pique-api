import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Role } from './entities/role.entity';
import { Access } from './entities/access.entity';
import { EndPoints } from './entities/endpoint.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../Email/email.module';
import { Otp } from '../users/entities/otps.entity';
import { Media } from '../media/entities/media.entity';

@Module({
  imports: [
    PassportModule,
    NotificationModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], // ✅ Import ConfigModule here
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Venue,
      Entertainer,
      Role,
      Access,
      EndPoints,
      Otp,
      Media,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UsersService],
  exports: [AuthService],
})
export class AuthModule {}
