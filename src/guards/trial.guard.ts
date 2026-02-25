import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admin bypass
    if (user?.role === 'admin') return true;

    // No hotel = no subscription check needed
    if (!user?.hotel_id) return true;

    const sub = await this.subRepo.findOne({ where: { hotel_id: user.hotel_id } });

    if (!sub) {
      throw new ForbiddenException('Chưa có gói đăng ký');
    }

    if (!sub.is_active) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa. Liên hệ admin.');
    }

    // Check if trial expired
    if (sub.plan === 'trial') {
      if (sub.trial_ends_at && new Date() > new Date(sub.trial_ends_at)) {
        throw new ForbiddenException('Hết thời gian dùng thử. Vui lòng nâng cấp gói để tiếp tục sử dụng.');
      }
    }

    // Check if paid plan expired
    if (sub.plan !== 'trial' && sub.expires_at) {
      if (new Date() > new Date(sub.expires_at)) {
        throw new ForbiddenException('Gói đăng ký đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.');
      }
    }

    return true;
  }
}
