import { Test, TestingModule } from '@nestjs/testing';
import { ChainAuthController } from './chain-auth.controller.js';
import { AuthService } from '../../auth/auth.service.js';

describe('ChainAuthController', () => {
  let controller: ChainAuthController;
  let authService: AuthService;

  const mockAuthService = {
    generateNonce: vi.fn(),
    verifySignature: vi.fn(),
    getMe: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainAuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<ChainAuthController>(ChainAuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createNonce', () => {
    it('should call authService.generateNonce', async () => {
      const dto = {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      };
      mockAuthService.generateNonce.mockResolvedValue({
        data: { nonce: 'testnonce' },
        message: 'Nonce generated successfully',
        errors: null,
      });

      const result = await controller.createNonce(968, dto);

      expect(authService.generateNonce).toHaveBeenCalledWith(dto, 968);
      expect(result).toEqual({
        data: { nonce: 'testnonce' },
        message: 'Nonce generated successfully',
        errors: null,
      });
    });
  });

  describe('verifySignature', () => {
    it('should call authService.verifySignature', async () => {
      const dto = {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        signature: '0x123',
      };
      mockAuthService.verifySignature.mockResolvedValue({
        data: { token: 'jwt-token' },
        message: 'Signature verified successfully',
        errors: null,
      });

      const result = await controller.verifySignature(968, dto);

      expect(authService.verifySignature).toHaveBeenCalledWith(dto, 968);
      expect(result).toEqual({
        data: { token: 'jwt-token' },
        message: 'Signature verified successfully',
        errors: null,
      });
    });
  });

  describe('getMe', () => {
    it('should call authService.getMe', async () => {
      const authHeader = 'Bearer token';
      mockAuthService.getMe.mockResolvedValue({
        data: { user: { id: '1' } },
        message: 'User profile retrieved successfully',
        errors: null,
      });

      const result = await controller.getMe(968, authHeader);

      expect(authService.getMe).toHaveBeenCalledWith(authHeader);
      expect(result).toEqual({
        data: { user: { id: '1' } },
        message: 'User profile retrieved successfully',
        errors: null,
      });
    });
  });
});
