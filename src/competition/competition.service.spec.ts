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
    listingTokenPrize: {
      findMany: vi.fn(),
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
    team: {
      create: vi.fn(),
      findMany: vi.fn(),
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

  describe('findListingTokenPrizes', () => {
    it('should return listing token prizes', async () => {
      const mockListingTokenPrizes = [
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
      ];

      mockPrismaService.listingTokenPrize.findMany.mockResolvedValue(mockListingTokenPrizes);

      const result = await service.findListingTokenPrizes();

      expect(mockPrismaService.listingTokenPrize.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual({
        data: mockListingTokenPrizes,
        message: 'Listing token prizes retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException when no listing token prizes found', async () => {
      mockPrismaService.listingTokenPrize.findMany.mockResolvedValue([]);

      await expect(service.findListingTokenPrizes()).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyTeams', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(service.findMyTeams(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header format is invalid', async () => {
      await expect(service.findMyTeams('Basic token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when jwt verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.findMyTeams('Bearer invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findMyTeams('Bearer valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user teams successfully', async () => {
      const mockUser = { id: 'user-1', wallet_address: '0x123' };
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Cyber Warriors',
          user_id: 'user-1',
          skills_suggestions: [],
          team_codes: [],
          team_roles: [],
        },
      ];

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.findMyTeams('Bearer valid-token');

      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { user_id: 'user-1' },
              { team_roles: { some: { user_id: 'user-1' } } },
            ],
            deleted_at: null,
          }),
        }),
      );
      expect(result).toEqual({
        data: mockTeams,
        message: 'Teams retrieved successfully',
        errors: null,
      });
    });
  });

  describe('findMyTeamByCompetitionId', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(service.findMyTeamByCompetitionId('comp-1', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException when competition is not found', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(service.findMyTeamByCompetitionId('comp-1', 'Bearer valid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user team for competition when found', async () => {
      const mockUser = { id: 'user-1', wallet_address: '0x123' };
      const mockCompetition = { id: 'comp-1', slug: 'comp-1' };
      const mockTeam = {
        id: 'team-1',
        name: 'Cyber Warriors',
        competition_id: 'comp-1',
        user_id: 'user-1',
      };

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.competition.findFirst.mockResolvedValue(mockCompetition);
      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findMyTeamByCompetitionId('comp-1', 'Bearer valid-token');

      expect(result).toEqual({
        data: mockTeam,
        message: 'Team retrieved successfully',
        errors: null,
      });
    });
  });

  describe('createTeam', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(
        service.createTeam('comp-1', undefined, { visibility: true, description: 'desc' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header format is invalid', async () => {
      await expect(
        service.createTeam('comp-1', 'Basic token', { visibility: true, description: 'desc' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when jwt verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.createTeam('comp-1', 'Bearer invalid-token', { visibility: true, description: 'desc' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when competition is not found', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(
        service.createTeam('invalid-comp', 'Bearer valid-token', { visibility: true, description: 'desc' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create a team with code and skill suggestions', async () => {
      const mockUser = { id: 'user-1', wallet_address: '0x123' };
      const mockComp = { id: 'comp-1', name: 'Hackathon 2026' };
      const mockCreatedTeam = {
        id: 'team-1',
        name: 'Alpha Team',
        visibility: true,
        description: 'Test description',
        competition_id: 'comp-1',
        user_id: 'user-1',
        skills_suggestions: [{ id: 'sk-1', name: 'Solidity', team_id: 'team-1' }],
        team_codes: [{ id: 'tc-1', code: 'COBALT-ABC1234567', team_id: 'team-1' }],
        team_roles: [{ id: 'tr-1', role: 'LEAD', user_id: 'user-1', team_id: 'team-1' }],
        created_at: new Date('2026-09-24'),
        updated_at: null,
      };

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.team.create.mockResolvedValue(mockCreatedTeam);

      const dto = {
        name: 'Alpha Team',
        visibility: true,
        description: 'Test description',
        skills_suggestion: ['Solidity'],
      };

      const result = await service.createTeam('comp-1', 'Bearer valid-token', dto);

      expect(mockPrismaService.team.create).toHaveBeenCalled();
      expect(result.message).toBe('Team created successfully');
      expect(result.data.name).toBe('Alpha Team');
      expect(result.data.skills_suggestions).toHaveLength(1);
      expect(result.data.team_code).toBeDefined();
    });

    it('should create a private team without generating a team code', async () => {
      const mockUser = { id: 'user-1', wallet_address: '0x123' };
      const mockComp = { id: 'comp-1', name: 'Hackathon 2026' };
      const mockCreatedTeam = {
        id: 'team-2',
        name: 'Private Team',
        visibility: false,
        description: 'Private description',
        competition_id: 'comp-1',
        user_id: 'user-1',
        skills_suggestions: [],
        team_codes: [],
        team_roles: [{ id: 'tr-1', role: 'LEAD', user_id: 'user-1', team_id: 'team-2' }],
        created_at: new Date('2026-09-24'),
        updated_at: null,
      };

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.team.create.mockResolvedValue(mockCreatedTeam);

      const dto = {
        name: 'Private Team',
        visibility: false,
        description: 'Private description',
      };

      const result = await service.createTeam('comp-1', 'Bearer valid-token', dto);

      expect(mockPrismaService.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibility: false,
          }),
        }),
      );
      const createData = mockPrismaService.team.create.mock.calls[mockPrismaService.team.create.mock.calls.length - 1][0].data;
      expect(createData.team_codes).toBeUndefined();
      expect(result.data.team_code).toBeNull();
    });
  });
});

