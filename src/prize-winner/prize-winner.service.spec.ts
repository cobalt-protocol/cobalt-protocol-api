import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrizeWinnerService } from './prize-winner.service.js';

describe('PrizeWinnerService', () => {
  let service: PrizeWinnerService;

  const mockCompetition = {
    id: '01J8Z9X0000000000000000001',
    competition_id: '1',
    name: 'Cobalt Hackathon 2026',
  };

  const mockPrizeWinner = {
    id: '01J8Z9X0000000000000000002',
    winner_id: 1n,
    category: '1st Place',
    amount: '1000',
    certificate_cid: 'QmWinnerCert123',
    competition_id: '01J8Z9X0000000000000000001',
    created_at: new Date('2026-09-23'),
    updated_at: null,
    deleted_at: null,
    winner: {
      id: '01J8Z9X0000000000000000003',
      wallet_address: '0x1234567890123456789012345678901234567890',
      user_id: '01J8Z9X0000000000000000004',
      prize_winner_id: '01J8Z9X0000000000000000002',
      user: {
        id: '01J8Z9X0000000000000000004',
        wallet_address: '0x1234567890123456789012345678901234567890',
        username: 'alice',
        email: 'alice@example.com',
        location: 'Jakarta',
        institution: 'ITB',
      },
    },
  };

  const mockPrismaService = {
    competition: {
      findFirst: vi.fn(),
    },
    prizeWinner: {
      findMany: vi.fn(),
    },
    prizeDeposited: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrizeWinnerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PrizeWinnerService>(PrizeWinnerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByCompetitionId', () => {
    it('should return prize winners for a valid competition ID', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(mockCompetition);
      mockPrismaService.prizeWinner.findMany.mockResolvedValue([mockPrizeWinner]);

      const result = await service.findByCompetitionId('01J8Z9X0000000000000000001');

      expect(mockPrismaService.competition.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: '01J8Z9X0000000000000000001' },
            { competition_id: '01J8Z9X0000000000000000001' },
          ],
          deleted_at: null,
        },
      });
      expect(mockPrismaService.prizeWinner.findMany).toHaveBeenCalledWith({
        where: {
          competition_id: mockCompetition.id,
          deleted_at: null,
        },
        include: {
          winner: {
            where: {
              deleted_at: null,
            },
            include: {
              user: {
                select: {
                  id: true,
                  wallet_address: true,
                  username: true,
                  email: true,
                  location: true,
                  institution: true,
                },
              },
            },
          },
        },
        orderBy: {
          winner_id: 'asc',
        },
      });
      expect(result).toEqual({
        data: [mockPrizeWinner],
        message: 'Prize winners retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException if competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(service.findByCompetitionId('invalid-comp-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if no prize winners are found for competition', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(mockCompetition);
      mockPrismaService.prizeWinner.findMany.mockResolvedValue([]);

      await expect(service.findByCompetitionId('01J8Z9X0000000000000000001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTokenPrizeByCompetitionId', () => {
    it('should return total prize and token address for a competition from prize_deposited', async () => {
      const mockComp = {
        id: '01J8Z9X0000000000000000001',
        competition_id: '1',
        token_address: '0x1234567890123456789012345678901234567890',
      };
      const mockDeposits = [
        { token_address: '0x1234567890123456789012345678901234567890', amount: '1000' },
        { token_address: '0x1234567890123456789012345678901234567890', amount: '750' },
      ];

      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.prizeDeposited.findMany.mockResolvedValue(mockDeposits);

      const result = await service.getTokenPrizeByCompetitionId('01J8Z9X0000000000000000001');

      expect(mockPrismaService.prizeDeposited.findMany).toHaveBeenCalledWith({
        where: {
          competition_id: mockComp.id,
          deleted_at: null,
        },
        select: {
          token_address: true,
          amount: true,
        },
      });
      expect(result).toEqual({
        data: {
          competition_id: mockComp.id,
          onchain_competition_id: mockComp.competition_id,
          token_address: mockComp.token_address,
          total_prize: '1750',
          prize_deposits_count: 2,
        },
        message: 'Token prize retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException if competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(service.getTokenPrizeByCompetitionId('invalid-comp-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
