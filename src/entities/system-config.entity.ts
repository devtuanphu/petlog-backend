import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ length: 100, nullable: true })
  description: string;

  @UpdateDateColumn()
  updated_at: Date;
}
