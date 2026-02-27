import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Room } from '../entities/room.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    private activityLog: ActivityLogService,
  ) {}

  async getBookings(hotelId: number, status?: string) {
    const query = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.pets', 'pets')
      .where('room.hotel_id = :hotelId', { hotelId })
      .orderBy('booking.created_at', 'DESC');

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    return query.getMany();
  }

  async checkout(hotelId: number, bookingId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['room'],
    });

    if (!booking) throw new NotFoundException('Booking không tìm thấy');
    if (booking.room.hotel_id !== hotelId) throw new ForbiddenException();
    if (booking.status !== 'active') throw new ForbiddenException('Booking đã kết thúc');

    booking.status = 'completed';
    booking.check_out_at = new Date();
    const saved = await this.bookingRepo.save(booking);

    await this.activityLog.log({
      hotelId: booking.room.hotel_id,
      action: 'BOOKING_CHECKOUT',
      targetType: 'booking',
      targetId: bookingId,
      metadata: { owner_name: booking.owner_name, room_name: booking.room.room_name },
    });

    return saved;
  }
}
