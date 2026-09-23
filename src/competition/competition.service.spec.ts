import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompetitionService } from './competition.service.js';

describe('CompetitionService', () => {
  let service: CompetitionService;

  const mockCompetition = {
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
  };

  const mockPrismaService = {
    competition: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    prizeWinner: {
      findMany: vi.fn(),
    },
    prizeDeposited: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  };

  const mockJwtService = {
    verifyAsync: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<CompetitionService>(CompetitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all competitions when no auth header is provided', async () => {
      mockPrismaService.competition.findMany.mockResolvedValue([mockCompetition]);

      const result = await service.findAll();

      expect(mockPrismaService.competition.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        include: {
          prize_winners: {
            where: { deleted_at: null },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual({
        data: [mockCompetition],
        message: 'Competitions retrieved successfully',
        errors: null,
      });
    });

    it('should return user competitions when valid auth header is provided', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.competition.findMany.mockResolvedValue([mockCompetition]);

      const result = await service.findAll('Bearer valid-token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(mockPrismaService.competition.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        data: [mockCompetition],
        message: 'Competitions retrieved successfully',
        errors: null,
      });
    });

    it('should throw UnauthorizedException when auth header format is invalid', async () => {
      await expect(service.findAll('InvalidHeader')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid or expired', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Jwt expired'));

      await expect(service.findAll('Bearer invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when no competitions found', async () => {
      mockPrismaService.competition.findMany.mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a competition by id', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(mockCompetition);

      const result = await service.findOne('01J8Z9X0000000000000000001');

      expect(mockPrismaService.competition.findFirst).toHaveBeenCalledWith({
        where: { id: '01J8Z9X0000000000000000001', deleted_at: null },
        include: {
          prize_winners: {
            where: { deleted_at: null },
          },
        },
      });
      expect(result).toEqual({
        data: mockCompetition,
        message: 'Competition retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException when competition not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPrizeWinners', () => {
    it('should return prize winners for a valid competition ID', async () => {
      const mockPrizeWinners = [
        {
          id: '01J8Z9X0000000000000000002',
          winner_id: 1n,
          category: '1st Place',
          amount: '1000',
          certificate_cid: 'QmWinnerCert123',
          competition_id: '01J8Z9X0000000000000000001',
          created_at: new Date('2026-09-23'),
          updated_at: null,
          deleted_at: null,
        },
      ];

      mockPrismaService.competition.findFirst.mockResolvedValue(mockCompetition);
      mockPrismaService.prizeWinner.findMany.mockResolvedValue(mockPrizeWinners);

      const result = await service.findPrizeWinners('01J8Z9X0000000000000000001');

      expect(mockPrismaService.competition.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: '01J8Z9X0000000000000000001' },
            { competition_id: '01J8Z9X0000000000000000001' },
          ],
          deleted_at: null,
        },
      });
      expect(result).toEqual({
        data: mockPrizeWinners,
        message: 'Prize winners retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException when competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(service.findPrizeWinners('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no prize winners found for competition', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(mockCompetition);
      mockPrismaService.prizeWinner.findMany.mockResolvedValue([]);

      await expect(service.findPrizeWinners('01J8Z9X0000000000000000001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTokenPrizeByCompetitionId', () => {
    it('should return total prize and token address for competition from prize_deposited', async () => {
      const mockComp = {
        id: '01J8Z9X0000000000000000001',
        competition_id: '1',
        token_address: '0x1234567890123456789012345678901234567890',
      };
      const mockDeposits = [
        { token_address: '0x1234567890123456789012345678901234567890', amount: '1000' },
        { token_address: '0x1234567890123456789012345678901234567890', amount: '500' },
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
          total_prize: '1500',
          prize_deposits_count: 2,
        },
        message: 'Token prize retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException when competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(service.getTokenPrizeByCompetitionId('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

