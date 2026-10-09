import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChainService } from './chain.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ChainService', () => {
  let service: ChainService;

  const mockPrismaService = {
    competition: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChainService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChainService>(ChainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompetitionsByChainId', () => {
    it('should return list of competitions for the given chain_id', async () => {
      const mockCompetitions = [
        {
          id: '01J8Z9X0000000000000000001',
          name: 'Cobalt Hackathon 2026',
          indexer_state: {
            chain_id: 11155111,
          },
          prize_winners: [],
        },
      ];

      mockPrismaService.competition.findMany.mockResolvedValue(mockCompetitions);

      const result = await service.getCompetitionsByChainId(11155111);

      expect(mockPrismaService.competition.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          indexer_state: {
            chain_id: 11155111,
          },
        },
        include: {
          prize_winners: {
            where: {
              deleted_at: null,
            },
          },
          indexer_state: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      expect(result).toEqual({
        data: mockCompetitions,
        message: 'Competitions retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException when no competitions are found', async () => {
      mockPrismaService.competition.findMany.mockResolvedValue([]);

      await expect(service.getCompetitionsByChainId(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when competitions query returns null', async () => {
      mockPrismaService.competition.findMany.mockResolvedValue(null);

      await expect(service.getCompetitionsByChainId(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
