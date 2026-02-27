import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import {
  Hotel,
  User,
  Room,
  Booking,
  Pet,
  Log,
  Subscription,
  Feedback,
  PricingPlan,
  Payment,
  SystemConfig,
} from './entities';
import { ActivityLog } from './entities/activity-log.entity';
import { AuthModule } from './auth/auth.module';
import { HotelModule } from './hotel/hotel.module';
import { RoomModule } from './room/room.module';
import { BookingModule } from './booking/booking.module';
import { OperationModule } from './operation/operation.module';
import { PublicModule } from './public/public.module';
import { UploadModule } from './upload/upload.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PaymentModule } from './payment/payment.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'petlog',
      entities: [
        Hotel,
        User,
        Room,
        Booking,
        Pet,
        Log,
        Subscription,
        Feedback,
        PricingPlan,
        Payment,
        SystemConfig,
        ActivityLog,
      ],
      synchronize: true, // MVP only - disable in production
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    ActivityLogModule,
    HotelModule,
    RoomModule,
    BookingModule,
    OperationModule,
    PublicModule,
    UploadModule,
    SubscriptionModule,
    AdminModule,
    FeedbackModule,
    PaymentModule,
  ],
})
export class AppModule {}
