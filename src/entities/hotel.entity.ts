import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Room } from './room.entity';
import { Subscription } from './subscription.entity';

@Entity('hotels')
export class Hotel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  logo_url: string;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ nullable: true })
  owner_id: number;

  @OneToMany(() => User, (user) => user.hotel)
  users: User[];

  @OneToMany(() => Room, (room) => room.hotel)
  rooms: Room[];

  @OneToOne(() => Subscription, (sub) => sub.hotel)
  subscription: Subscription;

  @CreateDateColumn()
  created_at: Date;
}
