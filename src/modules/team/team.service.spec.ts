import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TeamService } from './team.service.js';

describe('TeamService', () => {
  let service: TeamService;

  const mockPrismaService = {
    competition: {
      findFirst: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    teamRole: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    skillsSuggestion: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((cb) =>
      typeof cb === 'function' ? cb(mockPrismaService) : cb,
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    vi.clearAllMocks();
  });

  describe('listPublic', () => {
    it('should list all public teams', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Public Team 1',
          visibility: true,
          competition: { id: 'comp-1', competition_id: 'comp-1', name: 'Comp 1' },
          team_roles: [],
          team_codes: [],
        },
      ];
      mockPrismaService.team.count.mockResolvedValue(1);
      mockPrismaService.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.listPublic({ page: 1, limit: 6 } as any);

      expect(mockPrismaService.team.count).toHaveBeenCalledWith({
        where: { visibility: true, deleted_at: null },
      });
      expect(result.data).toEqual(mockTeams);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 6,
        totalPages: 1,
      });
    });

    it('should filter public teams by search query', async () => {
      mockPrismaService.team.count.mockResolvedValue(0);
      mockPrismaService.team.findMany.mockResolvedValue([]);

      await service.listPublic({ query: 'cyber', page: 1, limit: 6 } as any);

      expect(mockPrismaService.team.count).toHaveBeenCalledWith({
        where: {
          visibility: true,
          deleted_at: null,
          OR: [
            { name: { contains: 'cyber', mode: 'insensitive' } },
            { description: { contains: 'cyber', mode: 'insensitive' } },
          ],
        },
      });
    });
  });

  describe('listPublicByCompetitionId', () => {
    it('should throw NotFoundException if competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(
        service.listPublicByCompetitionId('non-existent-comp'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return public teams for the given competition id', async () => {
      const mockComp = { id: 'comp-1', name: 'Hackathon 2026' };
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Public Team 1',
          visibility: true,
          competition_id: 'comp-1',
        },
      ];

      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.listPublicByCompetitionId('comp-1');

      expect(mockPrismaService.competition.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: 'comp-1' },
            { competition_id: 'comp-1' },
          ],
          deleted_at: null,
        },
      });

      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith({
        where: {
          competition_id: 'comp-1',
          visibility: true,
          deleted_at: null,
        },
        include: expect.any(Object),
        orderBy: { created_at: 'desc' },
      });

      expect(result).toEqual({
        data: mockTeams,
        message: 'Teams retrieved successfully',
        errors: null,
      });
    });
  });

  describe('listAllByCompetitionId', () => {
    it('should throw NotFoundException if competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(
        service.listAllByCompetitionId('non-existent-comp', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not competition owner', async () => {
      const mockComp = {
        id: 'comp-1',
        name: 'Hackathon 2026',
        user_id: 'owner-user',
        organization: null,
      };
      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.listAllByCompetitionId('comp-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if no teams are found', async () => {
      const mockComp = {
        id: 'comp-1',
        name: 'Hackathon 2026',
        user_id: 'user-1',
      };
      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findMany.mockResolvedValue([]);

      await expect(
        service.listAllByCompetitionId('comp-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return all teams (public and private) for competition owner', async () => {
      const mockComp = {
        id: 'comp-1',
        name: 'Hackathon 2026',
        user_id: 'user-1',
      };
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Public Team',
          visibility: true,
          competition_id: 'comp-1',
        },
        {
          id: 'team-2',
          name: 'Private Team',
          visibility: false,
          competition_id: 'comp-1',
        },
      ];

      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.listAllByCompetitionId('comp-1', 'user-1');

      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith({
        where: {
          competition_id: 'comp-1',
          deleted_at: null,
        },
        include: expect.any(Object),
        orderBy: { created_at: 'desc' },
      });

      expect(result).toEqual({
        data: mockTeams,
        message: 'All teams retrieved successfully',
        errors: null,
      });
    });
  });

  describe('getCompetitionByTeamId', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.getCompetitionByTeamId('invalid-team', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not member of a private team', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'owner-user',
        visibility: false,
        team_roles: [{ user_id: 'owner-user', role: 'LEAD' }],
        competition: { id: 'comp-1', name: 'Hackathon' },
        team_codes: [],
      });

      await expect(
        service.getCompetitionByTeamId('team-1', 'non-member-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return competition and team relations if user is team lead', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Cyber Warriors',
        description: 'Building cool web3 apps',
        visibility: true,
        competition_id: 'comp-1',
        user_id: 'user-1',
        created_at: new Date('2026-01-01'),
        updated_at: null,
        competition: {
          id: 'comp-1',
          competition_id: 'comp-1',
          name: 'Cyber Hackathon',
          description: 'Web3 hackathon',
          requirement: 'Open to all',
          category: 'Web3',
          max_team_size: 4,
          registration_window: new Date(),
          competition_window: new Date(),
          submission_deadline: new Date(),
          judging_review: new Date(),
          result_announcement: new Date(),
          guidebook_cid: 'Qm123',
          certificate_cid: 'Qm456',
          created_at: new Date('2026-01-01'),
          updated_at: null,
        },
        team_roles: [
          {
            id: 'role-1',
            team_id: 'team-1',
            user_id: 'user-1',
            role: 'LEAD',
            created_at: new Date(),
            user: {
              id: 'user-1',
              wallet_address: '0x123',
              username: 'cyberlead',
              email: 'lead@cyber.com',
              location: 'ID',
              institution: 'Tech Uni',
            },
          },
        ],
        team_codes: [
          {
            id: 'code-1',
            team_id: 'team-1',
            code: 'COBALT-ABC12345',
            is_used: false,
            created_at: new Date(),
          },
        ],
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeamData);

      const result = await service.getCompetitionByTeamId('team-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.data.competition.id).toBe('comp-1');
      expect(result.data.team.id).toBe('team-1');
      expect(result.data.team_roles).toHaveLength(1);
      expect(result.data.team_codes).toHaveLength(1);
      expect(result.message).toBe(
        'Competition details by team ID retrieved successfully',
      );
    });
  });

  describe('requestJoin', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(service.requestJoin('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if team is private', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        visibility: false,
      });

      await expect(service.requestJoin('team-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if join request already exists', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        visibility: true,
        competition_id: 'comp-1',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        role: 'APPLICANT',
      });

      await expect(service.requestJoin('team-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create join request if valid and no pending request exists', async () => {
      const mockTeam = {
        id: 'team-1',
        visibility: true,
        competition_id: 'comp-1',
      };
      const mockCreatedRequest = {
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        role: 'APPLICANT',
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.teamRole.create.mockResolvedValue(mockCreatedRequest);

      const result = await service.requestJoin('team-1', 'user-1');

      expect(mockPrismaService.teamRole.create).toHaveBeenCalledWith({
        data: {
          team_id: 'team-1',
          user_id: 'user-1',
          role: 'APPLICANT',
        },
      });
      expect(result).toEqual({
        data: mockCreatedRequest,
        message: 'Join request sent',
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.update('team-1', 'non-leader-id', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if team name is empty string', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.update('team-1', 'leader-id', { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update team name successfully by leader', async () => {
      const mockTeam = {
        id: 'team-1',
        user_id: 'leader-id',
        name: 'Old Team Name',
      };
      const mockUpdatedTeam = {
        id: 'team-1',
        user_id: 'leader-id',
        name: 'New Team Name',
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.team.update.mockResolvedValue(mockUpdatedTeam);

      const result = await service.update('team-1', 'leader-id', {
        name: 'New Team Name',
      });

      expect(mockPrismaService.team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'team-1' },
          data: expect.objectContaining({ name: 'New Team Name' }),
        }),
      );
      expect(result).toEqual({
        data: mockUpdatedTeam,
        message: 'Team updated successfully',
      });
    });
  });

  describe('removeMember', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.removeMember('non-existent', 'member-1', 'leader-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester is not the team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.removeMember('team-1', 'member-1', 'non-leader-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if leader tries to remove themselves', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.removeMember('team-1', 'leader-id', 'leader-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target member is not in the team', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);

      await expect(
        service.removeMember('team-1', 'member-1', 'leader-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove member successfully when requested by team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'member-1',
        role: 'MEMBER',
      });

      const result = await service.removeMember(
        'team-1',
        'member-1',
        'leader-id',
      );

      expect(mockPrismaService.teamRole.deleteMany).toHaveBeenCalledWith({
        where: { team_id: 'team-1', user_id: 'member-1' },
      });
      expect(result).toEqual({ message: 'Member removed successfully' });
    });
  });
});


