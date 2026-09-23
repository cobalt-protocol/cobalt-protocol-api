import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrizeWinnerController } from './prize-winner.controller.js';
import { PrizeWinnerService } from './prize-winner.service.js';

describe('PrizeWinnerController', () => {
  let controller: PrizeWinnerController;

  const mockPrizeWinnerResponse = {
    data: [
      {
        id: '01J8Z9X0000000000000000002',
        winner_id: '1',
        category: '1st Place',
        amount: '1000',
        certificate_cid: 'QmWinnerCert123',
        competition_id: '01J8Z9X0000000000000000001',
        created_at: new Date('2026-09-23'),
        updated_at: null,
        deleted_at: null,
      },
    ],
    message: 'Prize winners retrieved successfully',
    errors: null,
  };

  const mockPrizeWinnerService = {
    findByCompetitionId: vi.fn(),
    getTokenPrizeByCompetitionId: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrizeWinnerController],
      providers: [
        { provide: PrizeWinnerService, useValue: mockPrizeWinnerService },
      ],
    }).compile();

    controller = module.get<PrizeWinnerController>(PrizeWinnerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByCompetitionId', () => {
    it('should return prize winners by competition ID (competition/:competition_id)', async () => {
      mockPrizeWinnerService.findByCompetitionId.mockResolvedValue(mockPrizeWinnerResponse);

      const result = await controller.findByCompetitionId('01J8Z9X0000000000000000001');

      expect(mockPrizeWinnerService.findByCompetitionId).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockPrizeWinnerResponse);
    });

    it('should return prize winners by competition ID direct (:competition_id)', async () => {
      mockPrizeWinnerService.findByCompetitionId.mockResolvedValue(mockPrizeWinnerResponse);

      const result = await controller.findByCompetitionIdDirect('01J8Z9X0000000000000000001');

      expect(mockPrizeWinnerService.findByCompetitionId).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockPrizeWinnerResponse);
    });

    it('should throw NotFoundException if service throws NotFoundException', async () => {
      mockPrizeWinnerService.findByCompetitionId.mockRejectedValue(
        new NotFoundException('No prize winners found for this competition'),
      );

      await expect(controller.findByCompetitionId('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTokenPrizeByCompetitionId', () => {
    it('should return token prize by competition ID', async () => {
      const mockTokenPrizeResponse = {
        data: {
          competition_id: '01J8Z9X0000000000000000001',
          onchain_competition_id: '1',
          token_address: '0x1234567890123456789012345678901234567890',
          total_prize: '1750',
          prize_winners_count: 3,
        },
        message: 'Token prize retrieved successfully',
        errors: null,
      };
      mockPrizeWinnerService.getTokenPrizeByCompetitionId.mockResolvedValue(
        mockTokenPrizeResponse,
      );

      const result = await controller.getTokenPrizeByCompetitionId('01J8Z9X0000000000000000001');

      expect(mockPrizeWinnerService.getTokenPrizeByCompetitionId).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockTokenPrizeResponse);
    });

    it('should return token prize by competition ID direct (:competition_id/token-prize)', async () => {
      const mockTokenPrizeResponse = {
        data: {
          competition_id: '01J8Z9X0000000000000000001',
          onchain_competition_id: '1',
          token_address: '0x1234567890123456789012345678901234567890',
          total_prize: '1750',
          prize_winners_count: 3,
        },
        message: 'Token prize retrieved successfully',
        errors: null,
      };
      mockPrizeWinnerService.getTokenPrizeByCompetitionId.mockResolvedValue(
        mockTokenPrizeResponse,
      );

      const result = await controller.getTokenPrizeByCompetitionIdDirect(
        '01J8Z9X0000000000000000001',
      );

      expect(mockPrizeWinnerService.getTokenPrizeByCompetitionId).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockTokenPrizeResponse);
    });
  });
});
