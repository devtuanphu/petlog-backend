import { Injectable, OnModuleInit, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Hotel } from '../entities/hotel.entity';
import { Subscription } from '../entities/subscription.entity';
import { Booking } from '../entities/booking.entity';
import { Room } from '../entities/room.entity';
import { Pet } from '../entities/pet.entity';
import { User } from '../entities/user.entity';
import { PricingPlan } from '../entities/plan.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger('AdminService');

  constructor(
    @InjectRepository(Hotel) private hotelRepo: Repository<Hotel>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Pet) private petRepo: Repository<Pet>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(PricingPlan) private planRepo: Repository<PricingPlan>,
    @InjectRepository(SystemConfig) private configRepo: Repository<SystemConfig>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Seed admin account
    const existing = await this.userRepo.findOne({ where: { email: 'admin@petlog.com' } });
    if (!existing) {
      const hashed = await bcrypt.hash('admin123', 10);
      await this.userRepo.save(
        this.userRepo.create({
          email: 'admin@petlog.com',
          password: hashed,
          full_name: 'PetLog Admin',
          role: 'admin',
        }),
      );
      this.logger.log('✅ Admin account created: admin@petlog.com / admin123');
    }

    // Seed pricing plans
    const planCount = await this.planRepo.count();
    if (planCount === 0) {
      await this.planRepo.save([
        {
          name: 'basic',
          display_name: 'Gói Cơ bản',
          price: 99000,
          max_rooms: 5,
          description: 'Phù hợp cho cửa hàng nhỏ',
          sort_order: 1,
        },
        {
          name: 'pro',
          display_name: 'Gói Chuyên nghiệp',
          price: 199000,
          max_rooms: 15,
          description: 'Phù hợp cho cửa hàng vừa',
          sort_order: 2,
        },
        {
          name: 'unlimited',
          display_name: 'Gói Không giới hạn',
          price: 499000,
          max_rooms: 999,
          description: 'Không giới hạn phòng',
          sort_order: 3,
        },
      ]);
      this.logger.log('✅ Pricing plans seeded');
    }

    // Seed system config
    const trialConfig = await this.configRepo.findOne({ where: { key: 'trial_days' } });
    if (!trialConfig) {
      await this.configRepo.save({
        key: 'trial_days',
        value: '14',
        description: 'Số ngày dùng thử',
      });
      this.logger.log('✅ System config seeded');
    }
  }

  // ─── Auth ───
  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Mật khẩu không đúng');

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.role !== 'admin') throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    };
  }

  // ─── Stats ───
  async getStats() {
    const totalHotels = await this.hotelRepo.count();
    const totalRooms = await this.roomRepo.count();
    const totalBookings = await this.bookingRepo.count();
    const activeBookings = await this.bookingRepo.count({ where: { status: 'active' } });
    const totalPets = await this.petRepo.count();
    const totalStaff = await this.userRepo.count({ where: { role: 'staff' } });

    const planRows = await this.subRepo
      .createQueryBuilder('sub')
      .select('sub.plan', 'plan')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('sub.plan')
      .getRawMany<{ plan: string; count: number }>();

    const planDistribution: Record<string, number> = {};
    for (const row of planRows) {
      planDistribution[row.plan] = Number(row.count);
    }

    return {
      totalHotels,
      totalRooms,
      totalBookings,
      activeBookings,
      totalPets,
      totalStaff,
      planDistribution,
    };
  }

  // ─── Charts ───
  async getChartData() {
    const months = 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const hotelGrowth = await this.hotelRepo
      .createQueryBuilder('h')
      .select("TO_CHAR(DATE_TRUNC('month', h.created_at), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)::int', 'count')
      .where('h.created_at >= :since', { since })
      .groupBy("DATE_TRUNC('month', h.created_at)")
      .orderBy("DATE_TRUNC('month', h.created_at)", 'ASC')
      .getRawMany<{ month: string; count: number }>();

    const bookingGrowth = await this.bookingRepo
      .createQueryBuilder('b')
      .select("TO_CHAR(DATE_TRUNC('month', b.check_in_at), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)::int', 'count')
      .where('b.check_in_at >= :since', { since })
      .groupBy("DATE_TRUNC('month', b.check_in_at)")
      .orderBy("DATE_TRUNC('month', b.check_in_at)", 'ASC')
      .getRawMany<{ month: string; count: number }>();

    const timeline: { month: string; hotels: number; bookings: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      timeline.push({
        month: key,
        hotels: Number(hotelGrowth.find((r) => r.month === key)?.count || 0),
        bookings: Number(bookingGrowth.find((r) => r.month === key)?.count || 0),
      });
    }

    // Actual revenue from payments
    const paidPayments = await this.paymentRepo.find({ where: { status: 'paid' } });
    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly payment revenue for chart
    for (const p of paidPayments) {
      if (p.paid_at) {
        const d = new Date(p.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const entry = timeline.find(t => t.month === key);
        if (entry) (entry as any).revenue = ((entry as any).revenue || 0) + p.amount;
      }
    }

    const totalRooms = await this.roomRepo.count();

    return { timeline, totalRevenue, totalRooms };
  }

  // ─── Hotels ───
  async getHotels() {
    const hotels = await this.hotelRepo.find({
      relations: ['owner', 'subscription', 'rooms'],
      order: { created_at: 'DESC' },
    });

    return hotels.map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      phone: h.phone,
      owner_name: h.owner?.full_name || '—',
      owner_email: h.owner?.email || '—',
      plan: h.subscription?.plan || 'trial',
      max_rooms: h.subscription?.max_rooms || 3,
      is_active: h.subscription?.is_active ?? true,
      trial_ends_at: h.subscription?.trial_ends_at,
      expires_at: h.subscription?.expires_at,
      room_count: h.rooms?.length || 0,
      created_at: h.created_at,
    }));
  }

  async getHotelById(id: number) {
    const h = await this.hotelRepo.findOne({
      where: { id },
      relations: ['owner', 'subscription', 'rooms', 'rooms.bookings', 'rooms.bookings.pets'],
    });
    if (!h) throw new NotFoundException('Cửa hàng không tồn tại');

    const rooms = (h.rooms || []).map((r) => {
      const activeBooking = r.bookings?.find((b) => b.status === 'active') || null;
      return {
        id: r.id,
        room_name: r.room_name,
        is_active: r.is_active,
        active_booking: activeBooking
          ? {
              id: activeBooking.id,
              owner_name: activeBooking.owner_name,
              owner_phone: activeBooking.owner_phone,
              check_in_at: activeBooking.check_in_at,
              expected_checkout: activeBooking.expected_checkout,
              pet_name: activeBooking.pets?.[0]?.name || '—',
              pet_species: activeBooking.pets?.[0]?.type || '',
            }
          : null,
      };
    });

    const activeRooms = rooms.filter((r) => r.active_booking).length;

    return {
      id: h.id,
      name: h.name,
      address: h.address,
      phone: h.phone,
      owner_name: h.owner?.full_name || '—',
      owner_email: h.owner?.email || '—',
      plan: h.subscription?.plan || 'trial',
      max_rooms: h.subscription?.max_rooms || 3,
      extra_rooms: h.subscription?.extra_rooms || 0,
      is_active: h.subscription?.is_active ?? true,
      trial_ends_at: h.subscription?.trial_ends_at,
      expires_at: h.subscription?.expires_at,
      started_at: h.subscription?.started_at,
      room_count: h.rooms?.length || 0,
      active_rooms: activeRooms,
      rooms,
      created_at: h.created_at,
    };
  }

  async getPaymentsByHotel(hotelId: number) {
    return this.paymentRepo.find({
      where: { hotel_id: hotelId },
      order: { created_at: 'DESC' },
    });
  }

  async updateSubscription(
    hotelId: number,
    data: { plan?: string; max_rooms?: number; extra_rooms?: number; is_active?: boolean },
  ) {
    let sub = await this.subRepo.findOne({ where: { hotel_id: hotelId } });
    if (!sub) {
      sub = this.subRepo.create({
        hotel_id: hotelId,
        plan: data.plan || 'trial',
        max_rooms: data.max_rooms || 3,
      });
    } else {
      if (data.plan !== undefined) sub.plan = data.plan;
      if (data.max_rooms !== undefined) sub.max_rooms = data.max_rooms;
      if (data.extra_rooms !== undefined) sub.extra_rooms = data.extra_rooms;
      if (data.is_active !== undefined) sub.is_active = data.is_active;
    }
    return this.subRepo.save(sub);
  }

  // ─── Plans CRUD ───
  async getPlans() {
    return this.planRepo.find({ order: { sort_order: 'ASC' } });
  }

  async createPlan(data: Partial<PricingPlan>) {
    const plan = this.planRepo.create(data);
    return this.planRepo.save(plan);
  }

  async updatePlan(id: number, data: Partial<PricingPlan>) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Gói không tồn tại');
    Object.assign(plan, data);
    return this.planRepo.save(plan);
  }

  async deletePlan(id: number) {
    await this.planRepo.delete(id);
    return { success: true };
  }

  // ─── System Config ───
  async getConfigs() {
    return this.configRepo.find();
  }

  async updateConfig(key: string, value: string) {
    let config = await this.configRepo.findOne({ where: { key } });
    if (!config) {
      config = this.configRepo.create({ key, value });
    } else {
      config.value = value;
    }
    return this.configRepo.save(config);
  }

  // ─── Payments (Revenue) ───
  async getPayments() {
    return this.paymentRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async getRevenue() {
    const payments = await this.paymentRepo.find({ where: { status: 'paid' } });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly revenue (last 6 months)
    const monthly: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = 0;
    }
    for (const p of payments) {
      if (p.paid_at) {
        const d = new Date(p.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthly[key] !== undefined) monthly[key] += p.amount;
      }
    }

    return {
      totalRevenue,
      totalPaid: payments.length,
      monthlyRevenue: Object.entries(monthly).map(([month, amount]) => ({ month, amount })),
    };
  }
}
