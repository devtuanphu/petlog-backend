import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pricing_plans')
export class PricingPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  name: string; // basic, pro, unlimited

  @Column({ length: 50 })
  display_name: string; // Gói Cơ bản, Gói Pro, ...

  @Column({ type: 'int' })
  price: number; // VNĐ/tháng

  @Column({ type: 'int' })
  max_rooms: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
