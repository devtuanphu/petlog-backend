import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Room } from '../entities/room.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
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
    return this.bookingRepo.save(booking);
  }
}
