import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './entities/AdminUser.entity';
import { Role } from './entities/role.entity';
import { JwtStrategy } from './jwt.strategy';
import { AdminuserService } from '../adminuser/adminuser.service';
import { RoleCapability } from './entities/role-capabilities.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { RolesGuardAdmin } from './roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], // ✅ Import ConfigModule here
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_ADMIN'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    TypeOrmModule.forFeature([AdminUser, Role, RoleCapability, Capability]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminuserService, RolesGuardAdmin],
})
export class AuthModule {}
