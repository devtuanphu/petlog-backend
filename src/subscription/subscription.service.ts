import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
  ) {}

  async getSubscription(hotelId: number) {
    const sub = await this.subRepo.findOne({ where: { hotel_id: hotelId } });
    if (!sub) throw new NotFoundException('Subscription không tìm thấy');
    return sub;
  }
}
