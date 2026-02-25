import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 255, nullable: true })
  full_name: string;

  @Column({ length: 20 })
  role: string; // 'owner' | 'staff'

  @ManyToOne(() => Hotel, (hotel) => hotel.users, { nullable: true })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;

  @Column({ nullable: true })
  hotel_id: number;

  @CreateDateColumn()
  created_at: Date;
}
