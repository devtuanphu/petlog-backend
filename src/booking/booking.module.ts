import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { Room } from '../entities/room.entity';
import { Pet } from '../entities/pet.entity';
import { Subscription } from '../entities/subscription.entity';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room, Pet, Subscription])],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
