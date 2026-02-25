import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { Booking } from '../entities/booking.entity';
import { Log } from '../entities/log.entity';
import { Pet } from '../entities/pet.entity';
import { Subscription } from '../entities/subscription.entity';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Booking, Log, Pet, Subscription])],
  controllers: [OperationController],
  providers: [OperationService],
})
export class OperationModule {}
