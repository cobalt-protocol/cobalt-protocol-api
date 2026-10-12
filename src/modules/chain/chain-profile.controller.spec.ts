import { Test, TestingModule } from '@nestjs/testing';
import { ChainProfileController } from './chain-profile.controller.js';
import { ChainService } from './chain.service.js';
import { AuthService } from '../../auth/auth.service.js';
import { JwtService } from '@nestjs/jwt';

describe('ChainProfileController', () => {
  let controller: ChainProfileController;
  let chainService: ChainService;
  let authService: AuthService;

  const mockChainService = {
    updateProfile: vi.fn(),
  };

  const mockAuthService = {
    getMe: vi.fn(),
  };

  const mockJwtService = {
    verifyAsync: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainProfileController],
      providers: [
        {
          provide: ChainService,
          useValue: mockChainService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<ChainProfileController>(ChainProfileController);
    chainService = module.get<ChainService>(ChainService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should call authService.getMe with authorization header', async () => {
      const authHeader = 'Bearer valid-token';
      const mockResult = {
        data: { user: { id: 'user-1', wallet_address: '0x123' } },
        message: 'User profile retrieved successfully',
        errors: null,
      };
      mockAuthService.getMe.mockResolvedValue(mockResult);

      const result = await controller.getMe(968, authHeader);

      expect(authService.getMe).toHaveBeenCalledWith(authHeader);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateProfile', () => {
    it('should call chainService.updateProfile with req.userId, chainId, and dto', async () => {
      const req = { userId: 'user-1' } as any;
      const dto = {
        username: 'alice',
        email: 'alice@example.com',
        pitch: 'Web3 Builder',
        skills: [{ name: 'Solidity', level: 'Intermediate' }],
      };
      const mockResult = {
        data: { user: { id: 'user-1', username: 'alice' } },
        message: 'Profile updated successfully',
        errors: null,
      };
      mockChainService.updateProfile.mockResolvedValue(mockResult);

      const result = await controller.updateProfile(968, req, dto);

      expect(chainService.updateProfile).toHaveBeenCalledWith('user-1', 968, dto);
      expect(result).toEqual(mockResult);
    });
  });
});
