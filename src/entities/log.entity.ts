import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Pet } from './pet.entity';
import { User } from './user.entity';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Booking, (booking) => booking.logs)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  booking_id: number;

  @ManyToOne(() => Pet, (pet) => pet.logs, { nullable: true })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ nullable: true })
  pet_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @Column({ nullable: true })
  staff_id: number;

  @Column({ length: 50 })
  action_type: string; // FEEDING, MEDICINE, WALKING, PHOTO, NOTE

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @CreateDateColumn()
  created_at: Date;
}
