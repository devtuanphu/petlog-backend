import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Hotel } from '../entities/hotel.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class HotelService {
  constructor(
    @InjectRepository(Hotel) private hotelRepo: Repository<Hotel>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getHotel(hotelId: number) {
    const hotel = await this.hotelRepo.findOne({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel không tìm thấy');
    return hotel;
  }

  async updateHotel(hotelId: number, data: Partial<Hotel>) {
    await this.hotelRepo.update(hotelId, data);
    return this.getHotel(hotelId);
  }

  async createStaff(hotelId: number, data: { email: string; password: string; full_name: string }) {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ForbiddenException('Email đã được sử dụng');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const staff = this.userRepo.create({
      email: data.email,
      password: hashedPassword,
      full_name: data.full_name,
      role: 'staff',
      hotel_id: hotelId,
    });
    return this.userRepo.save(staff);
  }

  async getStaff(hotelId: number) {
    return this.userRepo.find({
      where: { hotel_id: hotelId, role: 'staff' },
      select: ['id', 'email', 'full_name', 'role', 'created_at'],
    });
  }

  async deleteStaff(hotelId: number, staffId: number) {
    const staff = await this.userRepo.findOne({
      where: { id: staffId, hotel_id: hotelId, role: 'staff' },
    });
    if (!staff) throw new NotFoundException('Nhân viên không tìm thấy');
    await this.userRepo.remove(staff);
    return { message: 'Đã xóa nhân viên' };
  }
}
