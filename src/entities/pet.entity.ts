import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Log } from './log.entity';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Booking, (booking) => booking.pets)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  booking_id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  type: string;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @Column({ type: 'text', nullable: true })
  special_notes: string;

  @OneToMany(() => Log, (log) => log.pet)
  logs: Log[];
}
