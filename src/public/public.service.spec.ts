import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PublicService } from './public.service';
import { Room } from '../entities/room.entity';
import { Booking } from '../entities/booking.entity';
import { Pet } from '../entities/pet.entity';
import { Hotel } from '../entities/hotel.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn((entity) =>
    Promise.resolve(Array.isArray(entity) ? entity.map((e, i) => ({ id: i + 1, ...e })) : { id: 1, ...entity }),
  ),
});

describe('PublicService', () => {
  let service: PublicService;
  let roomRepo: ReturnType<typeof mockRepo>;
  let bookingRepo: ReturnType<typeof mockRepo>;
  let petRepo: ReturnType<typeof mockRepo>;
  let hotelRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    roomRepo = mockRepo();
    bookingRepo = mockRepo();
    petRepo = mockRepo();
    hotelRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: getRepositoryToken(Room), useValue: roomRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Pet), useValue: petRepo },
        { provide: getRepositoryToken(Hotel), useValue: hotelRepo },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  describe('getRoomInfo', () => {
    it('should return room info with availability = true when no active booking', async () => {
      roomRepo.findOne.mockResolvedValue({
        id: 1, room_name: 'Phòng 01', qr_token: 'abc',
        hotel: { name: 'Pet Paradise', address: '123 ABC', phone: '09', logo_url: null },
      });
      bookingRepo.findOne.mockResolvedValue(null);

      const result = await service.getRoomInfo('abc');

      expect(result.is_available).toBe(true);
      expect(result.room.room_name).toBe('Phòng 01');
      expect(result.hotel.name).toBe('Pet Paradise');
    });

    it('should return is_available = false when room has active booking', async () => {
      roomRepo.findOne.mockResolvedValue({
        id: 1, room_name: 'Phòng 01',
        hotel: { name: 'H', address: '', phone: '', logo_url: null },
      });
      bookingRepo.findOne.mockResolvedValue({ id: 10, status: 'active' });

      const result = await service.getRoomInfo('abc');

      expect(result.is_available).toBe(false);
    });

    it('should throw NotFoundException for invalid qr token', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.getRoomInfo('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkin', () => {
    const checkinData = {
      owner_name: 'Nguyen Van A',
      owner_phone: '0901234567',
      pets: [
        { name: 'Mochi', type: 'Chó', special_notes: 'Dị ứng gà' },
        { name: 'Luna', type: 'Mèo' },
      ],
    };

    it('should create booking and pets successfully', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1, qr_token: 'abc' });
      bookingRepo.findOne.mockResolvedValue(null); // no active booking
      // TypeORM save() mutates the entity in-place, adding the id
      bookingRepo.save.mockImplementation((entity) => {
        entity.id = 42;
        return Promise.resolve(entity);
      });

      const result = await service.checkin('abc', checkinData);

      expect(result.booking_id).toBe(42);
      expect(result.diary_token).toBeDefined();
      expect(result.diary_url).toContain('/diary/');
      expect(bookingRepo.save).toHaveBeenCalledTimes(1);
      expect(petRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should create correct number of pets', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1 });
      bookingRepo.findOne.mockResolvedValue(null);

      await service.checkin('abc', checkinData);

      expect(petRepo.create).toHaveBeenCalledTimes(2);
      expect(petRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Mochi', special_notes: 'Dị ứng gà' }),
      );
    });

    it('should throw ForbiddenException when room already occupied', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1 });
      bookingRepo.findOne.mockResolvedValue({ id: 10, status: 'active' });

      await expect(service.checkin('abc', checkinData)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for invalid room QR', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.checkin('bad-qr', checkinData)).rejects.toThrow(NotFoundException);
    });
  });

  describe('customerLookup', () => {
    it('should return customer info for existing phone', async () => {
      bookingRepo.findOne.mockResolvedValue({
        owner_name: 'Nguyen Van A', owner_phone: '0901234567',
      });

      const result = await service.customerLookup('0901234567');

      expect(result.found).toBe(true);
      expect(result.owner_name).toBe('Nguyen Van A');
    });

    it('should return found=false for unknown phone', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      const result = await service.customerLookup('0000000000');

      expect(result.found).toBe(false);
    });
  });

  describe('getDiary', () => {
    it('should return full diary data with pets and sorted logs', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000);
      bookingRepo.findOne.mockResolvedValue({
        owner_name: 'A', check_in_at: now, check_out_at: null, status: 'active',
        room: { room_name: 'Phòng 01', hotel: { name: 'H', logo_url: null } },
        pets: [{ id: 1, name: 'Mochi', type: 'Chó', image_url: null, special_notes: '' }],
        logs: [
          { id: 1, action_type: 'FEEDING', description: 'Cơm', created_at: earlier, pet: { name: 'Mochi' }, staff: { full_name: 'NV A' }, image_url: null },
          { id: 2, action_type: 'WALKING', description: 'Dạo', created_at: now, pet: { name: 'Mochi' }, staff: { full_name: 'NV B' }, image_url: null },
        ],
      });

      const result = await service.getDiary('diary123');

      expect(result.hotel_name).toBe('H');
      expect(result.pets).toHaveLength(1);
      expect(result.logs).toHaveLength(2);
      // Logs should be sorted newest first
      expect(result.logs[0].action_type).toBe('WALKING');
      expect(result.logs[1].action_type).toBe('FEEDING');
    });

    it('should throw NotFoundException for invalid diary token', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.getDiary('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
