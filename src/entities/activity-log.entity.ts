import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('activity_logs')
@Index(['hotel_id', 'created_at'])
@Index(['action', 'created_at'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  hotel_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ length: 50 })
  action: string;

  @Column({ length: 50, nullable: true })
  target_type: string;

  @Column({ nullable: true })
  target_id: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ length: 45, nullable: true })
  ip_address: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Hotel, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;
}
