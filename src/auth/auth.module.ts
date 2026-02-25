import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { Hotel } from '../entities/hotel.entity';
import { Subscription } from '../entities/subscription.entity';
import { SystemConfig } from '../entities/system-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Hotel, Subscription, SystemConfig]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petlog-super-secret-key-change-in-production',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
