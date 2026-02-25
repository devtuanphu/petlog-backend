import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Hotel } from './hotel.entity';
import { Booking } from './booking.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Hotel, (hotel) => hotel.rooms)
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;

  @Column()
  hotel_id: number;

  @Column({ length: 50 })
  room_name: string;

  @Column({ length: 100, unique: true })
  qr_token: string;

  @Column({ nullable: true })
  qr_image_url: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings: Booking[];
}
