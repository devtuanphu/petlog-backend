import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Booking } from '../entities/booking.entity';
import { Room } from '../entities/room.entity';

const mockBookingRepo = {
  findOne: jest.fn(),
  save: jest.fn((entity) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn(),
};

const mockRoomRepo = {
  findOne: jest.fn(),
};

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('getBookings', () => {
    it('should return all bookings for a hotel', async () => {
      const mockBookings = [
        { id: 1, owner_name: 'A', room: { hotel_id: 1 }, pets: [] },
        { id: 2, owner_name: 'B', room: { hotel_id: 1 }, pets: [] },
      ];

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBookings),
      };
      mockBookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBookings(1);

      expect(result).toHaveLength(2);
      expect(qb.where).toHaveBeenCalledWith('room.hotel_id = :hotelId', { hotelId: 1 });
    });

    it('should filter bookings by status when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockBookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getBookings(1, 'active');

      expect(qb.andWhere).toHaveBeenCalledWith('booking.status = :status', { status: 'active' });
    });

    it('should not filter by status when not provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockBookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getBookings(1);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('checkout', () => {
    it('should set booking status to completed and add checkout time', async () => {
      const mockBooking = {
        id: 1, status: 'active', room: { hotel_id: 1 },
        check_out_at: null,
      };
      mockBookingRepo.findOne.mockResolvedValue(mockBooking);

      const result = await service.checkout(1, 1);

      expect(mockBooking.status).toBe('completed');
      expect(mockBooking.check_out_at).toBeDefined();
      expect(mockBookingRepo.save).toHaveBeenCalledWith(mockBooking);
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.checkout(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when booking belongs to different hotel', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 1, status: 'active', room: { hotel_id: 2 },
      });

      await expect(service.checkout(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when booking already completed', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 1, status: 'completed', room: { hotel_id: 1 },
      });

      await expect(service.checkout(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
