import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy) {
  constructor(configservice: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configservice.get<string>('JWT_SECRET_ADMIN'),
    });
  }

  async validate(payload: any) {
    // console.log("Payload" ,payload)
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
