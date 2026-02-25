import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Hotel } from '../entities/hotel.entity';
import { Subscription } from '../entities/subscription.entity';

// Mock bcrypt
jest.mock('bcrypt');

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
  remove: jest.fn(),
  count: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockRepo>;
  let hotelRepo: ReturnType<typeof mockRepo>;
  let subRepo: ReturnType<typeof mockRepo>;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userRepo = mockRepo();
    hotelRepo = mockRepo();
    subRepo = mockRepo();
    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Hotel), useValue: hotelRepo },
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@petlog.vn',
      password: '123456',
      full_name: 'Nguyen Van A',
      hotel_name: 'Pet Paradise',
      hotel_address: '123 ABC',
      hotel_phone: '0901234567',
    };

    it('should register successfully and return token + user + hotel', async () => {
      userRepo.findOne.mockResolvedValue(null); // email not used
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(registerDto);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@petlog.vn');
      expect(result.user.role).toBe('owner');
      expect(result.hotel.name).toBe('Pet Paradise');
      expect(hotelRepo.save).toHaveBeenCalledTimes(2); // create + link owner
      expect(subRepo.save).toHaveBeenCalledTimes(1); // free subscription
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, email: 'test@petlog.vn' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should create a free subscription with max 3 rooms', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.register(registerDto);

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'free', max_rooms: 3 }),
      );
    });

    it('should hash the password with bcrypt', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed-pw' }));
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 1, email: 'test@petlog.vn', password: 'hashed', full_name: 'A',
        role: 'owner', hotel_id: 1, hotel: { id: 1, name: 'Pet Paradise' },
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@petlog.vn', password: '123456' });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@petlog.vn');
      expect(result.hotel.name).toBe('Pet Paradise');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login({ email: 'no@one.com', password: '123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, email: 'test@petlog.vn', password: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'test@petlog.vn', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return user, hotel and subscription info', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1, email: 'a@b.com', full_name: 'A', role: 'owner', hotel_id: 1,
        hotel: {
          id: 1, name: 'H', address: 'addr', phone: '09', logo_url: null,
          subscription: { plan: 'free', max_rooms: 3, expires_at: null },
        },
      });

      const result = await service.getMe(1);

      expect(result.user.id).toBe(1);
      expect(result.hotel.name).toBe('H');
      expect(result.subscription.plan).toBe('free');
      expect(result.subscription.max_rooms).toBe(3);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(UnauthorizedException);
    });
  });
});
