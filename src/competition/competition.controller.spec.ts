import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompetitionController } from './competition.controller.js';
import { CompetitionService } from './competition.service.js';

describe('CompetitionController', () => {
  let controller: CompetitionController;

  const mockCompetitionResponse = {
    data: [
      {
        id: '01J8Z9X0000000000000000001',
        tx_hash: '0x1234567890abcdef',
        name: 'Cobalt Hackathon 2026',
        category: 'Web3',
        description: 'Hackathon description',
        requirement: 'Requirements',
        registration_window: new Date('2026-10-01'),
        competition_window: new Date('2026-10-15'),
        submission_deadline: new Date('2026-11-01'),
        judging_review: new Date('2026-11-05'),
        result_announcement: new Date('2026-11-10'),
        pirze_certificate_claim: new Date('2026-11-15'),
        certificate_cid: 'Qm123',
        guidebook_cid: 'Qm456',
        created_at: new Date('2026-09-23'),
        updated_at: null,
        deleted_at: null,
        prize_winners: [],
      },
    ],
    message: 'Competitions retrieved successfully',
    errors: null,
  };

  const mockCompetitionService = {
    findAll: vi.fn(),
    findListingTokenPrizes: vi.fn(),
    findOne: vi.fn(),
    findPrizeWinners: vi.fn(),
    getTokenPrizeByCompetitionId: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionController],
      providers: [
        { provide: CompetitionService, useValue: mockCompetitionService },
      ],
    }).compile();

    controller = module.get<CompetitionController>(CompetitionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of competitions', async () => {
      mockCompetitionService.findAll.mockResolvedValue(mockCompetitionResponse);

      const result = await controller.findAll('Bearer sample-token');

      expect(mockCompetitionService.findAll).toHaveBeenCalledWith('Bearer sample-token');
      expect(result).toEqual(mockCompetitionResponse);
    });

    it('should throw NotFoundException if service throws NotFoundException', async () => {
      mockCompetitionService.findAll.mockRejectedValue(
        new NotFoundException('No competitions found'),
      );

      await expect(controller.findAll()).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return competition by id', async () => {
      const mockSingleResponse = {
        data: mockCompetitionResponse.data[0],
        message: 'Competition retrieved successfully',
        errors: null,
      };
      mockCompetitionService.findOne.mockResolvedValue(mockSingleResponse);

      const result = await controller.findOne('01J8Z9X0000000000000000001');

      expect(mockCompetitionService.findOne).toHaveBeenCalledWith('01J8Z9X0000000000000000001');
      expect(result).toEqual(mockSingleResponse);
    });

    it('should throw NotFoundException if service throws NotFoundException', async () => {
      mockCompetitionService.findOne.mockRejectedValue(
        new NotFoundException('Competition not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPrizeWinners', () => {
    it('should return prize winners by competition id', async () => {
      const mockPrizeWinnersResponse = {
        data: [
          {
            id: '01J8Z9X0000000000000000002',
            winner_id: '1',
            category: '1st Place',
            amount: '1000',
            certificate_cid: 'QmWinnerCert123',
            competition_id: '01J8Z9X0000000000000000001',
          },
        ],
        message: 'Prize winners retrieved successfully',
        errors: null,
      };
      mockCompetitionService.findPrizeWinners.mockResolvedValue(mockPrizeWinnersResponse);

      const result = await controller.findPrizeWinners('01J8Z9X0000000000000000001');

      expect(mockCompetitionService.findPrizeWinners).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockPrizeWinnersResponse);
    });

    it('should throw NotFoundException if service throws NotFoundException', async () => {
      mockCompetitionService.findPrizeWinners.mockRejectedValue(
        new NotFoundException('No prize winners found for this competition'),
      );

      await expect(controller.findPrizeWinners('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTokenPrizeByCompetitionId', () => {
    it('should return token prize by competition id', async () => {
      const mockTokenPrizeResponse = {
        data: {
          competition_id: '01J8Z9X0000000000000000001',
          onchain_competition_id: '1',
          token_address: '0x1234567890123456789012345678901234567890',
          total_prize: '1500',
          prize_winners_count: 2,
        },
        message: 'Token prize retrieved successfully',
        errors: null,
      };
      mockCompetitionService.getTokenPrizeByCompetitionId.mockResolvedValue(
        mockTokenPrizeResponse,
      );

      const result = await controller.getTokenPrizeByCompetitionId('01J8Z9X0000000000000000001');

      expect(mockCompetitionService.getTokenPrizeByCompetitionId).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockTokenPrizeResponse);
    });
  });

  describe('findListingTokenPrizes', () => {
    it('should return list of listing token prizes', async () => {
      const mockListingTokenPrizesResponse = {
        data: [
          {
            id: '01J8Z9X0000000000000000001',
            tx_hash: '0x1234567890abcdef',
            listing_token_prize_id: 1n,
            token_address: '0x1234567890123456789012345678901234567890',
            is_active: true,
            created_at: new Date('2026-09-23'),
            updated_at: null,
            deleted_at: null,
          },
        ],
        message: 'Listing token prizes retrieved successfully',
        errors: null,
      };
      mockCompetitionService.findListingTokenPrizes.mockResolvedValue(
        mockListingTokenPrizesResponse,
      );

      const result = await controller.findListingTokenPrizes();

      expect(mockCompetitionService.findListingTokenPrizes).toHaveBeenCalled();
      expect(result).toEqual(mockListingTokenPrizesResponse);
    });

    it('should throw NotFoundException if service throws NotFoundException', async () => {
      mockCompetitionService.findListingTokenPrizes.mockRejectedValue(
        new NotFoundException('No listing token prizes found'),
      );

      await expect(controller.findListingTokenPrizes()).rejects.toThrow(NotFoundException);
    });
  });
});
