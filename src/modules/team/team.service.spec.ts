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
    requestJoin: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    teamCode: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    signatureCertificateParticipant: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    skillsSuggestion: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    competitionFeePaid: {
      findFirst: vi.fn(),
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
          competition: {
            id: 'comp-1',
            competition_id: 'comp-1',
            name: 'Comp 1',
          },
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
          OR: [{ id: 'comp-1' }, { competition_id: 'comp-1' }],
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
        organization: { user_id: 'user-1' },
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
        organization: { user_id: 'user-1' },
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

    it('should return all teams when competition organization owner matches user wallet address', async () => {
      const mockComp = {
        id: 'comp-1',
        name: 'Hackathon 2026',
        organization: { user_id: '0x1234567890123456789012345678901234567890' },
      };
      const mockUser = {
        id: 'user-uuid-1',
        wallet_address: '0x1234567890123456789012345678901234567890',
      };
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Public Team',
          visibility: true,
          competition_id: 'comp-1',
        },
      ];

      mockPrismaService.competition.findFirst.mockResolvedValue(mockComp);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.listAllByCompetitionId(
        'comp-1',
        'user-uuid-1',
      );

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
          formation: '1-4 members',
          registration_window: new Date(),
          competition_window: new Date(),
          submission_deadline: new Date(),
          judging_review: new Date(),
          result_announcement: new Date(),
          pirze_certificate_claim: new Date('2026-12-15'),
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
      expect(result.data.competition.formation).toBe('1-4 members');
      expect(result.data.competition.pirze_certificate_claim).toEqual(new Date('2026-12-15'));
      expect(result.data.team.id).toBe('team-1');
      expect(result.data.team_roles).toHaveLength(1);
      expect(result.data.team_codes).toHaveLength(1);
      expect(result.message).toBe(
        'Competition details by team ID retrieved successfully',
      );
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

  describe('members', () => {
    it('should return team members when user is a team member', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        name: 'Team 1',
        visibility: true,
        user_id: 'owner-1',
        team_roles: [
          {
            id: 'role-1',
            role: 'LEAD',
            user_id: 'owner-1',
            user: { id: 'owner-1', username: 'owner', wallet_address: '0x1' },
          },
        ],
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue(null);

      const result = await service.members('team-1', 'owner-1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.username).toBe('owner');
    });

    it('should throw ForbiddenException if user has a pending join request', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        name: 'Team 1',
        visibility: true,
        user_id: 'owner-1',
        team_roles: [],
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
        deleted_at: null,
      });

      await expect(service.members('team-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(service.members('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user is not a member of the team and not competition owner', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        name: 'Team 1',
        visibility: false,
        user_id: 'owner-1',
        team_roles: [],
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue(null);

      await expect(service.members('team-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return team members when user is the competition owner even if not a team member', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        name: 'Team 1',
        visibility: true,
        user_id: 'member-1',
        competition: {
          id: 'comp-1',
          organization: { user_id: 'comp-owner-id' },
        },
        team_roles: [
          {
            id: 'role-1',
            role: 'LEAD',
            user_id: 'member-1',
            user: { id: 'member-1', username: 'member', wallet_address: '0x2' },
          },
        ],
      });

      const result = await service.members('team-1', 'comp-owner-id');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.username).toBe('member');
    });

    it('should return team members when user is competition owner even if join request is pending', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        name: 'Team 1',
        visibility: true,
        user_id: 'member-1',
        competition: {
          id: 'comp-1',
          organization: { user_id: 'comp-owner-id' },
        },
        team_roles: [
          {
            id: 'role-1',
            role: 'LEAD',
            user_id: 'member-1',
            user: { id: 'member-1', username: 'member', wallet_address: '0x2' },
          },
        ],
      });

      const result = await service.members('team-1', 'comp-owner-id');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('acceptInvite', () => {
    it('should throw NotFoundException if invite code is invalid or used', async () => {
      mockPrismaService.teamCode.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptInvite('team-1', 'invite-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is already a member', async () => {
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABCDE',
        team_id: 'team-1',
        is_used: false,
        team: { id: 'team-1', competition_id: 'comp-1' },
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'user-1',
      });

      await expect(
        service.acceptInvite('team-1', 'code-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark code as used, create member role and generate participant signature', async () => {
      const mockCode = {
        id: 'code-1',
        code: 'COBALT-ABCDE',
        team_id: 'team-1',
        is_used: false,
        team: { id: 'team-1', competition_id: 'comp-1' },
      };
      const mockCreatedRole = {
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'user-1',
        competition_id: 'comp-1',
        role: 'MEMBER',
      };

      mockPrismaService.teamCode.findFirst.mockResolvedValue(mockCode);
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.teamCode.update.mockResolvedValue({
        ...mockCode,
        is_used: true,
      });
      mockPrismaService.teamRole.create.mockResolvedValue(mockCreatedRole);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        wallet_address: '0x1234567890123456789012345678901234567890',
      });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-1',
        competition_id: '1',
        certificate_cid: 'Qm123',
      });
      mockPrismaService.signatureCertificateParticipant.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.signatureCertificateParticipant.create.mockResolvedValue(
        {},
      );

      const result = await service.acceptInvite('team-1', 'code-1', 'user-1');

      expect(mockPrismaService.teamCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        data: { is_used: true },
      });
      expect(mockPrismaService.teamRole.create).toHaveBeenCalledWith({
        data: {
          team_id: 'team-1',
          user_id: 'user-1',
          competition_id: 'comp-1',
          role: 'MEMBER',
        },
      });
      expect(
        mockPrismaService.signatureCertificateParticipant.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          user_id: 'user-1',
          competition_id: 'comp-1',
          deleted_at: null,
        },
      });
      expect(
        mockPrismaService.signatureCertificateParticipant.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'user-1',
            team_id: 'team-1',
            competition_id: 'comp-1',
            signature: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
          }),
        }),
      );
      expect(result).toEqual({
        data: mockCreatedRole,
        message: 'Successfully joined team',
      });
    });

    it('should update an existing participant signature when it differs', async () => {
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABCDE',
        team_id: 'team-1',
        is_used: false,
        team: { id: 'team-1', competition_id: 'comp-1' },
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.teamCode.update.mockResolvedValue({});
      mockPrismaService.teamRole.create.mockResolvedValue({ id: 'role-1' });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        wallet_address: '0x1234567890123456789012345678901234567890',
      });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-1',
        competition_id: '1',
        certificate_cid: 'Qm123',
      });
      mockPrismaService.signatureCertificateParticipant.findFirst.mockResolvedValue(
        {
          id: 'sig-1',
          signature: '0xdeadbeef',
        },
      );
      mockPrismaService.signatureCertificateParticipant.update.mockResolvedValue(
        {},
      );

      await service.acceptInvite('team-1', 'code-1', 'user-1');

      expect(
        mockPrismaService.signatureCertificateParticipant.create,
      ).not.toHaveBeenCalled();
      expect(
        mockPrismaService.signatureCertificateParticipant.update,
      ).toHaveBeenCalledWith({
        where: { id: 'sig-1' },
          data: {
            signature: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
            team_id: 'team-1',
          },
      });
    });

    it('should skip signature generation when user has no valid wallet_address', async () => {
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABCDE',
        team_id: 'team-1',
        is_used: false,
        team: { id: 'team-1', competition_id: 'comp-1' },
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.teamCode.update.mockResolvedValue({});
      mockPrismaService.teamRole.create.mockResolvedValue({ id: 'role-1' });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        wallet_address: 'not-a-wallet',
      });

      await service.acceptInvite('team-1', 'code-1', 'user-1');

      expect(mockPrismaService.competition.findFirst).not.toHaveBeenCalled();
      expect(
        mockPrismaService.signatureCertificateParticipant.create,
      ).not.toHaveBeenCalled();
      expect(
        mockPrismaService.signatureCertificateParticipant.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('requestJoin', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.requestJoin('non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({ id: 'team-1' });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'user-1',
      });

      await expect(service.requestJoin('team-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if user already has a pending join request', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({ id: 'team-1' });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.requestJoin.findUnique.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
        deleted_at: null,
      });

      await expect(service.requestJoin('team-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a new join request successfully', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({ id: 'team-1' });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.requestJoin.findUnique.mockResolvedValue(null);
      const mockCreatedReq = {
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
      };
      mockPrismaService.requestJoin.create.mockResolvedValue(mockCreatedReq);

      const result = await service.requestJoin('team-1', 'user-1');

      expect(mockPrismaService.requestJoin.create).toHaveBeenCalledWith({
        data: {
          team_id: 'team-1',
          user_id: 'user-1',
          status: 'pending',
        },
      });
      expect(result).toEqual({
        data: mockCreatedReq,
        message: 'Join request submitted successfully',
        errors: null,
      });
    });

    it('should update a previously rejected request back to pending', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({ id: 'team-1' });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.requestJoin.findUnique.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'rejected',
      });
      const mockUpdatedReq = {
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
      };
      mockPrismaService.requestJoin.update.mockResolvedValue(mockUpdatedReq);

      const result = await service.requestJoin('team-1', 'user-1');

      expect(mockPrismaService.requestJoin.update).toHaveBeenCalledWith({
        where: {
          team_id_user_id: { team_id: 'team-1', user_id: 'user-1' },
        },
        data: { status: 'pending', deleted_at: null },
      });
      expect(result).toEqual({
        data: mockUpdatedReq,
        message: 'Join request submitted successfully',
        errors: null,
      });
    });
  });
  describe('listRequestJoins', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.listRequestJoins('non-existent', 'leader-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.listRequestJoins('team-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return join requests list for team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      const mockRequests = [
        {
          id: 'req-1',
          team_id: 'team-1',
          user_id: 'user-1',
          status: 'pending',
          user: { id: 'user-1', username: 'john' },
        },
      ];
      mockPrismaService.requestJoin.findMany.mockResolvedValue(mockRequests);

      const result = await service.listRequestJoins('team-1', 'leader-id');

      expect(mockPrismaService.requestJoin.findMany).toHaveBeenCalledWith({
        where: { team_id: 'team-1', deleted_at: null },
        include: expect.any(Object),
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual({
        data: mockRequests,
        message: 'Join requests retrieved successfully',
        errors: null,
      });
    });
  });

  describe('acceptRequestJoin', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptRequestJoin('non-existent', 'req-1', 'leader-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.acceptRequestJoin('team-1', 'req-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if join request does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptRequestJoin('team-1', 'req-1', 'leader-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if join request status is not pending', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'accepted',
      });

      await expect(
        service.acceptRequestJoin('team-1', 'req-1', 'leader-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if requested user is already a team member', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'user-1',
      });

      await expect(
        service.acceptRequestJoin('team-1', 'req-1', 'leader-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept join request and create team member role successfully', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      const mockUpdatedReq = {
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'accepted',
      };
      const mockCreatedRole = {
        id: 'role-2',
        team_id: 'team-1',
        user_id: 'user-1',
        role: 'MEMBER',
      };
      mockPrismaService.requestJoin.update.mockResolvedValue(mockUpdatedReq);
      mockPrismaService.teamRole.create.mockResolvedValue(mockCreatedRole);

      const result = await service.acceptRequestJoin(
        'team-1',
        'req-1',
        'leader-id',
      );

      expect(result).toEqual({
        data: { request: mockUpdatedReq, role: mockCreatedRole },
        message: 'Join request accepted successfully',
        errors: null,
      });
    });

    it('should generate participant signature for the accepted user', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
        competition_id: 'comp-1',
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.requestJoin.update.mockResolvedValue({
        id: 'req-1',
        status: 'accepted',
      });
      mockPrismaService.teamRole.create.mockResolvedValue({ id: 'role-2' });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        wallet_address: '0x1234567890123456789012345678901234567890',
      });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-1',
        competition_id: '1',
        certificate_cid: 'Qm123',
      });
      mockPrismaService.signatureCertificateParticipant.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.signatureCertificateParticipant.create.mockResolvedValue(
        {},
      );

      await service.acceptRequestJoin('team-1', 'req-1', 'leader-id');

      expect(
        mockPrismaService.signatureCertificateParticipant.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'user-1',
            team_id: 'team-1',
            competition_id: 'comp-1',
            signature: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
          }),
        }),
      );
    });
  });

  describe('rejectRequestJoin', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.rejectRequestJoin('non-existent', 'req-1', 'leader-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });

      await expect(
        service.rejectRequestJoin('team-1', 'req-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject join request successfully', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-id',
      });
      mockPrismaService.requestJoin.findFirst.mockResolvedValue({
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'pending',
      });
      const mockRejectedReq = {
        id: 'req-1',
        team_id: 'team-1',
        user_id: 'user-1',
        status: 'rejected',
      };
      mockPrismaService.requestJoin.update.mockResolvedValue(mockRejectedReq);

      const result = await service.rejectRequestJoin(
        'team-1',
        'req-1',
        'leader-id',
      );

      expect(mockPrismaService.requestJoin.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'rejected' },
      });
      expect(result).toEqual({
        data: mockRejectedReq,
        message: 'Join request rejected successfully',
        errors: null,
      });
    });
  });
});
