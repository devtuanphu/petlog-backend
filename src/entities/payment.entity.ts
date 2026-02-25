import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Hotel)
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;

  @Column()
  hotel_id: number;

  @Column({ type: 'bigint', unique: true })
  order_code: number;

  @Column({ type: 'int' })
  amount: number;

  @Column({ length: 30 })
  plan_name: string;

  @Column({ type: 'int', default: 1 })
  months: number;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, paid, cancelled

  @Column({ type: 'jsonb', nullable: true })
  payos_data: Record<string, unknown>;

  @Column({ nullable: true })
  checkout_url: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;
}
