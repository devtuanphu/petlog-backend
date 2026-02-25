import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { Room } from '../entities/room.entity';
import { Subscription } from '../entities/subscription.entity';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class RoomService {
  private readonly uploadsDir = join(__dirname, '..', '..', 'uploads', 'qr');

  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
  ) {
    // Ensure QR upload directory exists
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private get frontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  async getRooms(hotelId: number) {
    const rooms = await this.roomRepo.find({
      where: { hotel_id: hotelId },
      order: { room_name: 'ASC' },
    });

    // Get active bookings for each room
    const roomsWithStatus = await Promise.all(
      rooms.map(async (room) => {
        const activeBooking = await this.bookingRepo.findOne({
          where: { room_id: room.id, status: 'active' },
          relations: ['pets'],
        });
        return {
          ...room,
          status: activeBooking ? 'occupied' : 'free',
          active_booking: activeBooking
            ? {
                id: activeBooking.id,
                owner_name: activeBooking.owner_name,
                check_in_at: activeBooking.check_in_at,
                expected_checkout: activeBooking.expected_checkout,
                diary_token: activeBooking.diary_token,
                pets: activeBooking.pets?.map((p) => ({
                  id: p.id,
                  name: p.name,
                  type: p.type,
                })),
              }
            : null,
        };
      }),
    );

    return roomsWithStatus;
  }

  async createBulk(hotelId: number, count: number) {
    await this.checkRoomLimit(hotelId, count);

    // Find current max room number
    const existingRooms = await this.roomRepo.find({ where: { hotel_id: hotelId } });
    const startNum = existingRooms.length + 1;

    const rooms: Room[] = [];
    for (let i = 0; i < count; i++) {
      const roomNum = String(startNum + i).padStart(2, '0');
      const qrToken = uuidv4().replace(/-/g, '').substring(0, 12);
      const room = this.roomRepo.create({
        hotel_id: hotelId,
        room_name: `Phòng ${roomNum}`,
        qr_token: qrToken,
      });
      rooms.push(room);
    }

    const savedRooms = await this.roomRepo.save(rooms);

    // Generate QR codes for all rooms
    await Promise.all(savedRooms.map((room) => this.generateQrImage(room)));

    return savedRooms;
  }

  async createOne(hotelId: number, roomName: string) {
    await this.checkRoomLimit(hotelId, 1);

    const qrToken = uuidv4().replace(/-/g, '').substring(0, 12);
    const room = this.roomRepo.create({
      hotel_id: hotelId,
      room_name: roomName,
      qr_token: qrToken,
    });

    const savedRoom = await this.roomRepo.save(room);
    await this.generateQrImage(savedRoom);

    return savedRoom;
  }

  async update(hotelId: number, roomId: number, data: { room_name?: string }) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId, hotel_id: hotelId },
    });
    if (!room) throw new NotFoundException('Phòng không tìm thấy');

    if (data.room_name) room.room_name = data.room_name;
    return this.roomRepo.save(room);
  }

  async delete(hotelId: number, roomId: number) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId, hotel_id: hotelId },
    });
    if (!room) throw new NotFoundException('Phòng không tìm thấy');

    // Check no active booking
    const activeBooking = await this.bookingRepo.findOne({
      where: { room_id: roomId, status: 'active' },
    });
    if (activeBooking) {
      throw new ForbiddenException('Không thể xóa phòng đang có pet');
    }

    await this.roomRepo.remove(room);
    return { message: 'Đã xóa phòng' };
  }

  private async generateQrImage(room: Room): Promise<void> {
    const checkinUrl = `${this.frontendUrl}/room/${room.qr_token}`;
    const filename = `${room.qr_token}.png`;
    const filepath = join(this.uploadsDir, filename);

    await QRCode.toFile(filepath, checkinUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    room.qr_image_url = `/uploads/qr/${filename}`;
    await this.roomRepo.save(room);
  }

  private async checkRoomLimit(hotelId: number, addCount: number) {
    const sub = await this.subRepo.findOne({ where: { hotel_id: hotelId, is_active: true } });
    const currentRoomCount = await this.roomRepo.count({ where: { hotel_id: hotelId } });

    const maxRooms = sub?.max_rooms || 3;
    if (currentRoomCount + addCount > maxRooms) {
      throw new ForbiddenException(
        `Gói ${sub?.plan || 'free'} chỉ cho phép tối đa ${maxRooms} phòng. Bạn đang có ${currentRoomCount} phòng. Vui lòng nâng gói để thêm phòng.`,
      );
    }
  }
}
