import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Hotel } from '../entities/hotel.entity';
import { Subscription } from '../entities/subscription.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Hotel) private hotelRepo: Repository<Hotel>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(SystemConfig) private configRepo: Repository<SystemConfig>,
    private jwtService: JwtService,
    private activityLog: ActivityLogService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    // 1. Create hotel
    const hotel = this.hotelRepo.create({
      name: dto.hotel_name,
      address: dto.hotel_address,
      phone: dto.hotel_phone,
    });
    await this.hotelRepo.save(hotel);

    // 2. Create owner user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      full_name: dto.full_name,
      role: 'owner',
      hotel_id: hotel.id,
    });
    await this.userRepo.save(user);

    // 3. Link owner to hotel
    hotel.owner_id = user.id;
    await this.hotelRepo.save(hotel);

    // 4. Create trial subscription
    const trialConfig = await this.configRepo.findOne({ where: { key: 'trial_days' } });
    const trialDays = trialConfig ? parseInt(trialConfig.value) : 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const subscription = this.subRepo.create({
      hotel_id: hotel.id,
      plan: 'trial',
      max_rooms: 3, // limited during trial
      trial_ends_at: trialEndsAt,
    });
    await this.subRepo.save(subscription);

    // 5. Generate JWT
    const token = this.generateToken(user);

    // 6. Log activity
    await this.activityLog.log({
      hotelId: hotel.id,
      userId: user.id,
      action: 'REGISTER',
      metadata: { hotel_name: hotel.name, email: user.email, full_name: user.full_name },
    });

    return {
      access_token: token,
      user: this.sanitizeUser(user),
      hotel: { id: hotel.id, name: hotel.name },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['hotel'],
    });

    if (!user) {
      await this.activityLog.log({ action: 'LOGIN_FAILED', metadata: { email: dto.email } });
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.activityLog.log({
        hotelId: user.hotel_id,
        userId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { email: dto.email },
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const token = this.generateToken(user);

    await this.activityLog.log({
      hotelId: user.hotel_id,
      userId: user.id,
      action: 'LOGIN',
      metadata: { email: user.email, role: user.role },
    });

    return {
      access_token: token,
      user: this.sanitizeUser(user),
      hotel: user.hotel ? { id: user.hotel.id, name: user.hotel.name } : null,
    };
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['hotel', 'hotel.subscription'],
    });

    if (!user) throw new UnauthorizedException();

    return {
      user: this.sanitizeUser(user),
      hotel: user.hotel
        ? {
            id: user.hotel.id,
            name: user.hotel.name,
            address: user.hotel.address,
            phone: user.hotel.phone,
            logo_url: user.hotel.logo_url,
          }
        : null,
      subscription: user.hotel?.subscription
        ? {
            plan: user.hotel.subscription.plan,
            max_rooms: user.hotel.subscription.max_rooms,
            extra_rooms: user.hotel.subscription.extra_rooms || 0,
            expires_at: user.hotel.subscription.expires_at,
            trial_ends_at: user.hotel.subscription.trial_ends_at,
            is_active: user.hotel.subscription.is_active,
          }
        : null,
    };
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      hotel_id: user.hotel_id,
    });
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      hotel_id: user.hotel_id,
    };
  }
}
