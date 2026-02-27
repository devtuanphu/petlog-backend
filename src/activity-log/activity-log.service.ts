import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';

export type ActivityAction =
  | 'REGISTER'
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'STAFF_INVITE'
  | 'ROOM_CREATE'
  | 'ROOM_DELETE'
  | 'BOOKING_CHECKIN'
  | 'BOOKING_CHECKOUT'
  | 'BOOKING_EXTEND'
  | 'LOG_CREATE'
  | 'PAYMENT_CREATE'
  | 'PAYMENT_SUCCESS'
  | 'DIARY_VIEW'
  | 'QR_SCAN'
  | 'HOTEL_UPDATE';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private logRepo: Repository<ActivityLog>,
  ) {}

  async log(params: {
    hotelId?: number;
    userId?: number;
    action: ActivityAction;
    targetType?: string;
    targetId?: number;
    metadata?: Record<string, unknown>;
    ip?: string;
  }) {
    try {
      const entry = this.logRepo.create({
        hotel_id: params.hotelId,
        user_id: params.userId,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId,
        metadata: params.metadata,
        ip_address: params.ip,
      });
      await this.logRepo.save(entry);
    } catch {
      // Activity logging should never break main flow
    }
  }

  async getRecentLogs(options: {
    page?: number;
    limit?: number;
    hotelId?: number;
    action?: string;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);

    const qb = this.logRepo
      .createQueryBuilder('al')
      .leftJoin('al.hotel', 'hotel')
      .addSelect(['hotel.id', 'hotel.name'])
      .orderBy('al.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.hotelId) {
      qb.andWhere('al.hotel_id = :hotelId', { hotelId: options.hotelId });
    }
    if (options.action) {
      qb.andWhere('al.action = :action', { action: options.action });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getSmartAlerts() {
    // Hotels registered but no rooms created
    const notOnboarded = await this.logRepo.query(`
      SELECT h.id, h.name, h.created_at, u.email, u.full_name
      FROM hotels h
      JOIN users u ON u.hotel_id = h.id AND u.role = 'owner'
      WHERE NOT EXISTS (SELECT 1 FROM rooms r WHERE r.hotel_id = h.id)
      ORDER BY h.created_at DESC
      LIMIT 10
    `);

    // Hotels with rooms but no bookings ever
    const noBookings = await this.logRepo.query(`
      SELECT h.id, h.name, h.created_at, u.email,
        (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id) as room_count
      FROM hotels h
      JOIN users u ON u.hotel_id = h.id AND u.role = 'owner'
      WHERE EXISTS (SELECT 1 FROM rooms r WHERE r.hotel_id = h.id)
        AND NOT EXISTS (SELECT 1 FROM bookings b
          JOIN rooms r2 ON r2.id = b.room_id WHERE r2.hotel_id = h.id)
      ORDER BY h.created_at DESC
      LIMIT 10
    `);

    // Trial expiring in <= 3 days
    const trialExpiring = await this.logRepo.query(`
      SELECT h.id, h.name, s.trial_ends_at, u.email,
        EXTRACT(DAY FROM s.trial_ends_at - NOW()) as days_left
      FROM subscriptions s
      JOIN hotels h ON h.id = s.hotel_id
      JOIN users u ON u.hotel_id = h.id AND u.role = 'owner'
      WHERE s.plan = 'trial' AND s.is_active = true
        AND s.trial_ends_at <= NOW() + INTERVAL '3 days'
        AND s.trial_ends_at > NOW()
      ORDER BY s.trial_ends_at ASC
      LIMIT 10
    `);

    // Inactive hotels (no activity_logs in 7+ days, but have rooms)
    const inactive = await this.logRepo.query(`
      SELECT h.id, h.name, u.email,
        (SELECT MAX(al.created_at) FROM activity_logs al WHERE al.hotel_id = h.id) as last_active
      FROM hotels h
      JOIN users u ON u.hotel_id = h.id AND u.role = 'owner'
      WHERE EXISTS (SELECT 1 FROM rooms r WHERE r.hotel_id = h.id)
        AND (
          NOT EXISTS (SELECT 1 FROM activity_logs al WHERE al.hotel_id = h.id)
          OR (SELECT MAX(al.created_at) FROM activity_logs al WHERE al.hotel_id = h.id) < NOW() - INTERVAL '7 days'
        )
      ORDER BY last_active ASC NULLS FIRST
      LIMIT 10
    `);

    return { notOnboarded, noBookings, trialExpiring, inactive };
  }
}
