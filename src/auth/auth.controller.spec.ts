import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateNonce: vi.fn().mockResolvedValue({
      data: {
        nonce: 'mock-nonce',
        user: { id: '1', wallet_address: '0x123' },
      },
      message: 'Nonce generated successfully',
      errors: null,
    }),
    verifySignature: vi.fn().mockResolvedValue({
      data: {
        token: 'mock-token',
        user: { id: '1', wallet_address: '0x123' },
      },
      message: 'Signature verified successfully',
      errors: null,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call generateNonce', async () => {
    const dto = { walletAddress: '0x123' };
    const res = await controller.createNonce(dto);
    expect(mockAuthService.generateNonce).toHaveBeenCalledWith(dto);
    expect(res.data.nonce).toBe('mock-nonce');
    expect(res.errors).toBeNull();
  });

  it('should call verifySignature', async () => {
    const dto = { walletAddress: '0x123', signature: '0xabc' };
    const res = await controller.verifySignature(dto);
    expect(mockAuthService.verifySignature).toHaveBeenCalledWith(dto);
    expect(res.data.token).toBe('mock-token');
    expect(res.errors).toBeNull();
  });
});



