import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'petlog-super-secret-key-change-in-production',
    });
  }

  async validate(payload: { sub: number; email: string; role: string; hotel_id: number }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      hotel_id: payload.hotel_id,
    };
  }
}
