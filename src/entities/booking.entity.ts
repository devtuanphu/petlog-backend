import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Room } from './room.entity';
import { Pet } from './pet.entity';
import { Log } from './log.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Room, (room) => room.bookings)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column()
  room_id: number;

  @Column({ length: 255 })
  owner_name: string;

  @Column({ length: 20 })
  owner_phone: string;

  @Column({ length: 100, unique: true })
  diary_token: string;

  @CreateDateColumn()
  check_in_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  check_out_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expected_checkout: Date;

  @Column({ length: 20, default: 'active' })
  status: string; // 'active' | 'completed'

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Pet, (pet) => pet.booking, { cascade: true })
  pets: Pet[];

  @OneToMany(() => Log, (log) => log.booking)
  logs: Log[];
}
