import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Hotel } from '../entities/hotel.entity';
import { Room } from '../entities/room.entity';
import { Booking } from '../entities/booking.entity';
import { Pet } from '../entities/pet.entity';
import { Log } from '../entities/log.entity';
import { Subscription } from '../entities/subscription.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'petlog',
    entities: [User, Hotel, Room, Booking, Pet, Log, Subscription],
    synchronize: false,
  });

  await ds.initialize();
  const userRepo = ds.getRepository(User);

  const existing = await userRepo.findOne({ where: { email: 'admin@petlog.com' } });
  if (existing) {
    console.log('Admin account already exists!');
    await ds.destroy();
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = userRepo.create({
    email: 'admin@petlog.com',
    password: hashedPassword,
    full_name: 'PetLog Admin',
    role: 'admin',
  });

  await userRepo.save(admin);
  console.log('✅ Admin account created: admin@petlog.com / admin123');
  await ds.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
