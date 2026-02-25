import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoomService } from './room.service';
import { Room } from '../entities/room.entity';
import { Subscription } from '../entities/subscription.entity';
import { Booking } from '../entities/booking.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn((entity) => Promise.resolve(Array.isArray(entity) ? entity.map((e, i) => ({ id: i + 1, ...e })) : { id: 1, ...entity })),
  remove: jest.fn(),
  count: jest.fn(),
});

describe('RoomService', () => {
  let service: RoomService;
  let roomRepo: ReturnType<typeof mockRepo>;
  let subRepo: ReturnType<typeof mockRepo>;
  let bookingRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    roomRepo = mockRepo();
    subRepo = mockRepo();
    bookingRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: getRepositoryToken(Room), useValue: roomRepo },
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  describe('getRooms', () => {
    it('should return rooms with status and active booking info', async () => {
      roomRepo.find.mockResolvedValue([
        { id: 1, room_name: 'Phòng 01', hotel_id: 1, qr_token: 'abc123' },
        { id: 2, room_name: 'Phòng 02', hotel_id: 1, qr_token: 'def456' },
      ]);
      bookingRepo.findOne
        .mockResolvedValueOnce({
          id: 10, owner_name: 'Chủ A', check_in_at: new Date(), diary_token: 'diary1',
          pets: [{ id: 1, name: 'Mochi', type: 'Chó' }],
        })
        .mockResolvedValueOnce(null);

      const result = await service.getRooms(1);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('occupied');
      expect(result[0].active_booking.owner_name).toBe('Chủ A');
      expect(result[1].status).toBe('free');
      expect(result[1].active_booking).toBeNull();
    });
  });

  describe('createBulk', () => {
    it('should create multiple rooms with sequential names', async () => {
      subRepo.findOne.mockResolvedValue({ plan: 'free', max_rooms: 10, is_active: true });
      roomRepo.count.mockResolvedValue(0);
      roomRepo.find.mockResolvedValue([]);

      const result = await service.createBulk(1, 3);

      expect(roomRepo.create).toHaveBeenCalledTimes(3);
      expect(roomRepo.create).toHaveBeenCalledWith(expect.objectContaining({ room_name: 'Phòng 01' }));
      expect(roomRepo.create).toHaveBeenCalledWith(expect.objectContaining({ room_name: 'Phòng 02' }));
      expect(roomRepo.create).toHaveBeenCalledWith(expect.objectContaining({ room_name: 'Phòng 03' }));
      expect(roomRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when exceeding room limit', async () => {
      subRepo.findOne.mockResolvedValue({ plan: 'free', max_rooms: 3, is_active: true });
      roomRepo.count.mockResolvedValue(2);

      await expect(service.createBulk(1, 2)).rejects.toThrow(ForbiddenException);
    });

    it('should continue numbering from existing rooms', async () => {
      subRepo.findOne.mockResolvedValue({ plan: 'pro', max_rooms: 30, is_active: true });
      roomRepo.count.mockResolvedValue(5);
      roomRepo.find.mockResolvedValue(new Array(5)); // 5 existing

      await service.createBulk(1, 2);

      expect(roomRepo.create).toHaveBeenCalledWith(expect.objectContaining({ room_name: 'Phòng 06' }));
      expect(roomRepo.create).toHaveBeenCalledWith(expect.objectContaining({ room_name: 'Phòng 07' }));
    });
  });

  describe('createOne', () => {
    it('should create a single room with custom name', async () => {
      subRepo.findOne.mockResolvedValue({ plan: 'free', max_rooms: 3, is_active: true });
      roomRepo.count.mockResolvedValue(1);

      const result = await service.createOne(1, 'VIP Suite');

      expect(roomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ room_name: 'VIP Suite', hotel_id: 1 }),
      );
      expect(result).toBeDefined();
    });

    it('should generate a qr_token for the room', async () => {
      subRepo.findOne.mockResolvedValue({ plan: 'free', max_rooms: 3, is_active: true });
      roomRepo.count.mockResolvedValue(0);

      await service.createOne(1, 'Test');

      expect(roomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ qr_token: expect.any(String) }),
      );
    });
  });

  describe('update', () => {
    it('should update room name', async () => {
      const room = { id: 1, hotel_id: 1, room_name: 'Old' };
      roomRepo.findOne.mockResolvedValue(room);

      await service.update(1, 1, { room_name: 'New Name' });

      expect(room.room_name).toBe('New Name');
      expect(roomRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if room not found', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.update(1, 999, { room_name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a room without active booking', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1, hotel_id: 1 });
      bookingRepo.findOne.mockResolvedValue(null);

      const result = await service.delete(1, 1);

      expect(roomRepo.remove).toHaveBeenCalled();
      expect(result.message).toBe('Đã xóa phòng');
    });

    it('should throw ForbiddenException if room has active booking', async () => {
      roomRepo.findOne.mockResolvedValue({ id: 1, hotel_id: 1 });
      bookingRepo.findOne.mockResolvedValue({ id: 10, status: 'active' });

      await expect(service.delete(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if room not found', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.delete(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
