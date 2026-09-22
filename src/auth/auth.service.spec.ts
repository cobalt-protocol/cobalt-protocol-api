import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-uuid-1',
    wallet_address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
    nonce_connect: {
      id: 'nonce-uuid-1',
      nonce: 'a1b2c3d4e5f678901234567890abcdef',
      user_id: 'user-uuid-1',
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    nonceConnect: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mocked-jwt-access-token'),
    verifyAsync: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateNonce', () => {
    it('should generate a valid nonce without wallet address', async () => {
      const result = await service.generateNonce();

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('nonce');
      expect(typeof result.data.nonce).toBe('string');
      expect(result.data.nonce.length).toBe(32);
      expect(result.data.user).toBeUndefined();
      expect(result.message).toBe('Nonce generated successfully');
      expect(result.errors).toBeNull();
    });

    it('should check user and insert nonce when wallet address exists', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.nonceConnect.upsert.mockResolvedValue({
        id: 'nonce-1',
        nonce: 'abc',
        user_id: mockUser.id,
      });

      const result = await service.generateNonce({ walletAddress });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { wallet_address: walletAddress.toLowerCase() },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockPrismaService.nonceConnect.upsert).toHaveBeenCalledWith({
        where: { user_id: mockUser.id },
        create: expect.objectContaining({
          nonce: result.data.nonce,
          user_id: mockUser.id,
        }),
        update: {
          nonce: result.data.nonce,
        },
      });
      expect(result.data.user).toEqual(mockUser);
      expect(result.message).toBe('Nonce generated successfully');
      expect(result.errors).toBeNull();
    });

    it('should create user if user does not exist and insert nonce', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.nonceConnect.upsert.mockResolvedValue({
        id: 'nonce-1',
        nonce: 'abc',
        user_id: mockUser.id,
      });

      const result = await service.generateNonce({ walletAddress });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wallet_address: walletAddress.toLowerCase(),
        }),
      });
      expect(mockPrismaService.nonceConnect.upsert).toHaveBeenCalled();
      expect(result.data.user).toEqual(mockUser);
      expect(result.message).toBe('Nonce generated successfully');
      expect(result.errors).toBeNull();
    });
  });

  describe('getMe', () => {
    it('should throw UnauthorizedException when header is missing', async () => {
      await expect(service.getMe()).rejects.toThrow('Missing authorization header');
    });

    it('should throw UnauthorizedException when format is not Bearer', async () => {
      await expect(service.getMe('Basic token')).rejects.toThrow('Invalid authorization header format');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      await expect(service.getMe('Bearer invalid-token')).rejects.toThrow('Invalid or expired token');
    });

    it('should return user profile when token is valid', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        wallet_address: mockUser.wallet_address,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('Bearer valid-token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual({
        data: {
          user: mockUser,
        },
        message: 'User profile retrieved successfully',
        errors: null,
      });
    });
  });
});





