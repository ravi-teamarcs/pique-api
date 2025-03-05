import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_ADMIN || 'admin',
    });
  }

  async validate(payload: any) {
    // console.log("Payload" ,payload)
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
