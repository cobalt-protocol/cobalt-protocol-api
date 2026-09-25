import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TeamService } from './team.service.js';

describe('TeamService - getCompetitionByTeamId', () => {
  let service: TeamService;

  const mockPrismaService = {
    team: {
      findFirst: vi.fn(),
    },
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
        slug: 'cyber-hackathon',
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

