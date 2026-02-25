import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Room } from '../entities/room.entity';
import { Booking } from '../entities/booking.entity';
import { Pet } from '../entities/pet.entity';
import { Hotel } from '../entities/hotel.entity';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Pet) private petRepo: Repository<Pet>,
    @InjectRepository(Hotel) private hotelRepo: Repository<Hotel>,
  ) {}

  async getRoomInfo(qrToken: string) {
    const room = await this.roomRepo.findOne({
      where: { qr_token: qrToken },
      relations: ['hotel'],
    });
    if (!room) throw new NotFoundException('Phòng không tìm thấy');

    // Check if room already has active booking
    const activeBooking = await this.bookingRepo.findOne({
      where: { room_id: room.id, status: 'active' },
      relations: ['pets'],
    });

    return {
      room: { id: room.id, room_name: room.room_name },
      hotel: {
        name: room.hotel.name,
        address: room.hotel.address,
        phone: room.hotel.phone,
        logo_url: room.hotel.logo_url,
      },
      is_available: !activeBooking,
      active_booking: activeBooking
        ? {
            diary_token: activeBooking.diary_token,
            owner_name: activeBooking.owner_name,
            pets: activeBooking.pets?.map((p) => ({ name: p.name, type: p.type })),
          }
        : null,
    };
  }

  async checkin(
    qrToken: string,
    data: {
      owner_name: string;
      owner_phone: string;
      expected_checkout?: string;
      pets: { name: string; type?: string; image_url?: string; special_notes?: string }[];
    },
  ) {
    const room = await this.roomRepo.findOne({ where: { qr_token: qrToken } });
    if (!room) throw new NotFoundException('Phòng không tìm thấy');

    // Check room available
    const activeBooking = await this.bookingRepo.findOne({
      where: { room_id: room.id, status: 'active' },
    });
    if (activeBooking) throw new ForbiddenException('Phòng này đang có pet, không thể check-in');

    // Create booking
    const diaryToken = uuidv4().replace(/-/g, '').substring(0, 16);
    const booking = this.bookingRepo.create({
      room_id: room.id,
      owner_name: data.owner_name,
      owner_phone: data.owner_phone,
      diary_token: diaryToken,
      expected_checkout: data.expected_checkout ? new Date(data.expected_checkout) : undefined,
      status: 'active',
    });
    await this.bookingRepo.save(booking);

    // Create pets
    const pets = data.pets.map((p) =>
      this.petRepo.create({
        booking_id: booking.id,
        name: p.name,
        type: p.type,
        image_url: p.image_url,
        special_notes: p.special_notes,
      }),
    );
    await this.petRepo.save(pets);

    return {
      booking_id: booking.id,
      diary_token: diaryToken,
      diary_url: `/diary/${diaryToken}`,
    };
  }

  async customerLookup(phone: string) {
    const lastBooking = await this.bookingRepo.findOne({
      where: { owner_phone: phone },
      order: { created_at: 'DESC' },
    });

    if (!lastBooking) return { found: false };

    return {
      found: true,
      owner_name: lastBooking.owner_name,
      owner_phone: lastBooking.owner_phone,
    };
  }

  async getDiary(diaryToken: string) {
    const booking = await this.bookingRepo.findOne({
      where: { diary_token: diaryToken },
      relations: ['room', 'room.hotel', 'pets', 'logs', 'logs.staff', 'logs.pet'],
    });
    if (!booking) throw new NotFoundException('Diary không tìm thấy');

    return {
      booking_id: booking.id,
      hotel_name: booking.room.hotel.name,
      hotel_logo: booking.room.hotel.logo_url,
      room_name: booking.room.room_name,
      owner_name: booking.owner_name,
      check_in_at: booking.check_in_at,
      check_out_at: booking.check_out_at,
      expected_checkout: booking.expected_checkout,
      status: booking.status,
      pets: booking.pets.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        image_url: p.image_url,
        special_notes: p.special_notes,
      })),
      logs: booking.logs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((l) => ({
          id: l.id,
          pet_name: l.pet?.name,
          action_type: l.action_type,
          description: l.description,
          image_url: l.image_url,
          staff_name: l.staff?.full_name,
          created_at: l.created_at,
        })),
    };
  }
}
