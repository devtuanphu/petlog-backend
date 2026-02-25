import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Hotel } from '../entities/hotel.entity';
import { Subscription } from '../entities/subscription.entity';
import { Booking } from '../entities/booking.entity';
import { Room } from '../entities/room.entity';
import { Pet } from '../entities/pet.entity';
import { User } from '../entities/user.entity';
import { PricingPlan } from '../entities/plan.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { Payment } from '../entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hotel, Subscription, Booking, Room, Pet, User, PricingPlan, SystemConfig, Payment,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'petlog-super-secret-key-change-in-production'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
