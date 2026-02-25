import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    @InjectRepository(Subscription)
    private subRepo: Repository<Subscription>,
  ) {}

  /**
   * Chạy mỗi giờ: tự động khoá gói trial hết hạn
   */
  @Cron(CronExpression.EVERY_HOUR)
  async deactivateExpiredTrials() {
    const now = new Date();

    const result = await this.subRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ is_active: false })
      .where('plan = :plan', { plan: 'trial' })
      .andWhere('trial_ends_at IS NOT NULL')
      .andWhere('trial_ends_at < :now', { now })
      .andWhere('is_active = :active', { active: true })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.warn(
        `🔒 Đã khoá ${result.affected} gói trial hết hạn`,
      );
    }
  }

  /**
   * Chạy mỗi giờ: tự động khoá gói trả phí hết hạn
   */
  @Cron(CronExpression.EVERY_HOUR)
  async deactivateExpiredPaidPlans() {
    const now = new Date();

    const result = await this.subRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ is_active: false })
      .where('plan NOT IN (:...plans)', { plans: ['trial', 'free'] })
      .andWhere('expires_at IS NOT NULL')
      .andWhere('expires_at < :now', { now })
      .andWhere('is_active = :active', { active: true })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.warn(
        `🔒 Đã khoá ${result.affected} gói trả phí hết hạn`,
      );
    }
  }

  /**
   * Chạy mỗi ngày lúc 8:00 sáng: log thống kê subscription
   */
  @Cron('0 8 * * *')
  async dailySubscriptionReport() {
    const total = await this.subRepo.count();
    const active = await this.subRepo.count({ where: { is_active: true } });
    const trials = await this.subRepo.count({
      where: { plan: 'trial', is_active: true },
    });

    this.logger.log(
      `📊 Subscription report: ${active}/${total} active, ${trials} trials`,
    );
  }
}
