import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { Booking } from '../entities/booking.entity';
import { Log } from '../entities/log.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Log) private logRepo: Repository<Log>,
  ) {}

  async getRoomByQr(qrToken: string, hotelId: number) {
    const room = await this.roomRepo.findOne({
      where: { qr_token: qrToken, hotel_id: hotelId },
    });
    if (!room) throw new NotFoundException('Phòng không tìm thấy');

    const activeBooking = await this.bookingRepo.findOne({
      where: { room_id: room.id, status: 'active' },
      relations: ['pets', 'logs', 'logs.staff', 'logs.pet'],
      order: { check_in_at: 'DESC' },
    });

    return {
      room: { id: room.id, room_name: room.room_name, qr_token: room.qr_token },
      booking: activeBooking
        ? {
            id: activeBooking.id,
            owner_name: activeBooking.owner_name,
            owner_phone: activeBooking.owner_phone,
            check_in_at: activeBooking.check_in_at,
            diary_token: activeBooking.diary_token,
            pets: activeBooking.pets,
            logs: activeBooking.logs?.map((l) => ({
              id: l.id,
              action_type: l.action_type,
              description: l.description,
              image_url: l.image_url,
              pet_name: l.pet?.name,
              staff_name: l.staff?.full_name,
              created_at: l.created_at,
            })),
          }
        : null,
    };
  }

  async createLog(
    staffId: number,
    data: { booking_id: number; pet_id?: number; action_type: string; description?: string; image_url?: string },
  ) {
    const booking = await this.bookingRepo.findOne({ where: { id: data.booking_id, status: 'active' } });
    if (!booking) throw new NotFoundException('Booking không tìm thấy hoặc đã kết thúc');

    const log = this.logRepo.create({
      booking_id: data.booking_id,
      pet_id: data.pet_id,
      staff_id: staffId,
      action_type: data.action_type,
      description: data.description,
      image_url: data.image_url,
    });
    return this.logRepo.save(log);
  }

  async getLogs(bookingId: number) {
    const logs = await this.logRepo.find({
      where: { booking_id: bookingId },
      relations: ['staff', 'pet'],
      order: { created_at: 'DESC' },
    });
    return logs.map((l) => ({
      id: l.id,
      action_type: l.action_type,
      description: l.description,
      image_url: l.image_url,
      pet_name: l.pet?.name,
      staff_name: l.staff?.full_name,
      created_at: l.created_at,
    }));
  }

  async extendBooking(bookingId: number, newDate: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, status: 'active' },
    });
    if (!booking)
      throw new NotFoundException(
        'Booking không tìm thấy hoặc đã kết thúc',
      );
    booking.expected_checkout = new Date(newDate);
    await this.bookingRepo.save(booking);
    return { success: true, expected_checkout: booking.expected_checkout };
  }
}
