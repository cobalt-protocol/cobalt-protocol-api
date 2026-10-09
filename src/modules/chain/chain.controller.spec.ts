import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChainController } from './chain.controller.js';
import { ChainService } from './chain.service.js';

describe('ChainController', () => {
  let controller: ChainController;

  const mockResponse = {
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
        indexer_state: {
          id: '01J8Z9X0000000000000000099',
          contract_name: 'CobaltCompetition',
          chain_id: 11155111,
          last_scanned_block: 100,
        },
      },
    ],
    message: 'Competitions retrieved successfully',
    errors: null,
  };

  const mockChainService = {
    getCompetitionsByChainId: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainController],
      providers: [
        {
          provide: ChainService,
          useValue: mockChainService,
        },
      ],
    }).compile();

    controller = module.get<ChainController>(ChainController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompetitionsByChainId', () => {
    it('should return competitions for a given chain id', async () => {
      mockChainService.getCompetitionsByChainId.mockResolvedValue(mockResponse);

      const result = await controller.getCompetitionsByChainId(11155111);

      expect(mockChainService.getCompetitionsByChainId).toHaveBeenCalledWith(11155111);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if chain service throws NotFoundException', async () => {
      mockChainService.getCompetitionsByChainId.mockRejectedValue(
        new NotFoundException('No competitions found for chain ID 999'),
      );

      await expect(controller.getCompetitionsByChainId(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
