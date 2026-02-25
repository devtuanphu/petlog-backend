import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { OperationService } from './operation.service';
import { Room } from '../entities/room.entity';
import { Booking } from '../entities/booking.entity';
import { Log } from '../entities/log.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
});

describe('OperationService', () => {
  let service: OperationService;
  let roomRepo: ReturnType<typeof mockRepo>;
  let bookingRepo: ReturnType<typeof mockRepo>;
  let logRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    roomRepo = mockRepo();
    bookingRepo = mockRepo();
    logRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationService,
        { provide: getRepositoryToken(Room), useValue: roomRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Log), useValue: logRepo },
      ],
    }).compile();

    service = module.get<OperationService>(OperationService);
  });

  describe('getRoomByQr', () => {
    it('should return room and active booking with pets and logs', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1, room_name: 'Phòng 01', qr_token: 'abc', hotel_id: 1 });
      bookingRepo.findOne.mockResolvedValue({
        id: 10, owner_name: 'A', owner_phone: '09', check_in_at: new Date(), diary_token: 'd1',
        pets: [{ id: 1, name: 'Mochi', type: 'Chó' }],
        logs: [
          { id: 1, action_type: 'FEEDING', description: 'Ăn', created_at: new Date(), pet: { name: 'Mochi' }, staff: { full_name: 'NV' }, image_url: null },
        ],
      });

      const result = await service.getRoomByQr('abc', 1);

      expect(result.room.room_name).toBe('Phòng 01');
      expect(result.booking).toBeDefined();
      expect(result.booking.pets).toHaveLength(1);
      expect(result.booking.logs).toHaveLength(1);
      expect(result.booking.logs[0].staff_name).toBe('NV');
    });

    it('should return null booking when room has no active booking', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1, room_name: 'Phòng 01', qr_token: 'abc' });
      bookingRepo.findOne.mockResolvedValue(null);

      const result = await service.getRoomByQr('abc', 1);

      expect(result.room.room_name).toBe('Phòng 01');
      expect(result.booking).toBeNull();
    });

    it('should throw NotFoundException for invalid QR or wrong hotel', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.getRoomByQr('bad-qr', 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createLog', () => {
    it('should create a care log entry', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 10, status: 'active' });

      const result = await service.createLog(5, {
        booking_id: 10, pet_id: 1, action_type: 'FEEDING', description: 'Ăn sáng',
      });

      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: 10, pet_id: 1, staff_id: 5,
          action_type: 'FEEDING', description: 'Ăn sáng',
        }),
      );
      expect(logRepo.save).toHaveBeenCalled();
    });

    it('should create log without pet_id (general note)', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 10, status: 'active' });

      await service.createLog(5, {
        booking_id: 10, action_type: 'NOTE', description: 'Ghi chú chung',
      });

      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ pet_id: undefined, action_type: 'NOTE' }),
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createLog(5, { booking_id: 999, action_type: 'FEEDING' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when booking is completed (not active)', async () => {
      // findOne queries for status: 'active', so returns null for completed bookings
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createLog(5, { booking_id: 10, action_type: 'FEEDING' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
