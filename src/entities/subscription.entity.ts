import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Hotel, (hotel) => hotel.subscription)
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;

  @Column()
  hotel_id: number;

  @Column({ length: 20, default: 'trial' })
  plan: string; // trial, basic, pro, unlimited

  @Column({ default: 3 })
  max_rooms: number;

  @Column({ default: 0 })
  extra_rooms: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date;

  @Column({ default: true })
  is_active: boolean;
}
