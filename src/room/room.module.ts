import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { Subscription } from '../entities/subscription.entity';
import { Booking } from '../entities/booking.entity';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Subscription, Booking])],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
