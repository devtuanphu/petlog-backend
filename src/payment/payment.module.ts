import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from '../entities/payment.entity';
import { PricingPlan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { SystemConfig } from '../entities/system-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PricingPlan, Subscription, SystemConfig])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
