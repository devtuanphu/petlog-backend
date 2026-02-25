import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../entities/subscription.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private subRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hotelId: number = request.user?.hotel_id;

    if (!hotelId) {
      throw new ForbiddenException('Không tìm thấy thông tin cửa hàng');
    }

    const sub = await this.subRepo.findOne({ where: { hotel_id: hotelId } });

    if (!sub) {
      throw new ForbiddenException(
        'Cửa hàng chưa có gói dịch vụ. Vui lòng nâng cấp.',
      );
    }

    if (!sub.is_active) {
      throw new ForbiddenException(
        'Gói dịch vụ đã bị tắt. Vui lòng liên hệ admin.',
      );
    }

    // Check trial expiry
    if (sub.plan === 'trial' && sub.trial_ends_at) {
      if (new Date(sub.trial_ends_at) < new Date()) {
        throw new ForbiddenException(
          'Thời gian dùng thử đã hết. Vui lòng nâng cấp gói để tiếp tục sử dụng.',
        );
      }
    }

    // Check paid plan expiry
    if (sub.plan !== 'trial' && sub.plan !== 'free' && sub.expires_at) {
      if (new Date(sub.expires_at) < new Date()) {
        throw new ForbiddenException(
          'Gói dịch vụ đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.',
        );
      }
    }

    return true;
  }
}
