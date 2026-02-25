import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback) private feedbackRepo: Repository<Feedback>,
  ) {}

  async submit(data: { message: string; type: string; user_id: number; hotel_id: number }) {
    const feedback = this.feedbackRepo.create(data);
    return this.feedbackRepo.save(feedback);
  }

  async getAll() {
    return this.feedbackRepo.find({
      relations: ['user', 'hotel'],
      order: { created_at: 'DESC' },
      select: {
        id: true,
        message: true,
        type: true,
        is_read: true,
        created_at: true,
        user: { id: true, full_name: true, email: true },
        hotel: { id: true, name: true },
      },
    });
  }

  async markAsRead(id: number) {
    await this.feedbackRepo.update(id, { is_read: true });
    return { message: 'Đã đánh dấu đã đọc' };
  }

  async getUnreadCount() {
    return this.feedbackRepo.count({ where: { is_read: false } });
  }
}
