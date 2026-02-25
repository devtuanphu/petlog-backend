import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Hotel } from './hotel.entity';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 20, default: 'suggestion' })
  type: string; // 'suggestion' | 'bug' | 'complaint' | 'other'

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => Hotel, { nullable: true })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;

  @Column({ nullable: true })
  hotel_id: number;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
