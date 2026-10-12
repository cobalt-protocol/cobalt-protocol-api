import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChainController } from './chain.controller.js';
import { ChainService } from './chain.service.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';

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
    getCompetitionByChainIdAndId: vi.fn(),
    createTeam: vi.fn(),
    getUserTeamsByChainId: vi.fn(),
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
        {
          provide: JwtService,
          useValue: { verifyAsync: vi.fn() },
        },
        AuthSessionGuard,
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

      expect(mockChainService.getCompetitionsByChainId).toHaveBeenCalledWith(
        11155111,
      );
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

  describe('getCompetitionByChainIdAndId', () => {
    it('should return a specific competition for a given chain id and competition id', async () => {
      mockChainService.getCompetitionByChainIdAndId.mockResolvedValue(mockResponse);

      const result = await controller.getCompetitionByChainIdAndId(11155111, '01J8Z9X0000000000000000001');

      expect(mockChainService.getCompetitionByChainIdAndId).toHaveBeenCalledWith(
        11155111,
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if chain service throws NotFoundException', async () => {
      mockChainService.getCompetitionByChainIdAndId.mockRejectedValue(
        new NotFoundException('Competition with ID invalid not found on chain ID 11155111'),
      );

      await expect(
        controller.getCompetitionByChainIdAndId(11155111, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTeam', () => {
    it('should pass data to chainService.createTeam', async () => {
      mockChainService.createTeam.mockResolvedValue({ message: 'Team created' });
      const req = { userId: 'user-1' } as any;
      const dto = { name: 'My Team', visibility: true, description: 'Desc' };

      const result = await controller.createTeam(11155111, 'comp-1', req, dto);

      expect(mockChainService.createTeam).toHaveBeenCalledWith('user-1', 11155111, 'comp-1', dto);
      expect(result).toEqual({ message: 'Team created' });
    });
  });

  describe('getUserTeamsByChainId', () => {
    it('should return user teams for a given chain id', async () => {
      mockChainService.getUserTeamsByChainId.mockResolvedValue({ message: 'Success' });
      const req = { userId: 'user-1' } as any;

      const result = await controller.getUserTeamsByChainId(11155111, req);

      expect(mockChainService.getUserTeamsByChainId).toHaveBeenCalledWith('user-1', 11155111);
      expect(result).toEqual({ message: 'Success' });
    });
  });
});


