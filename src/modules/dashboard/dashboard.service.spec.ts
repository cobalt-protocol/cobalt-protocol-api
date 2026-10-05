import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrisma = {
    teamRole: {
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return memberships and pending requests for user', async () => {
    const mockMemberships = [
      {
        role: 'LEADER',
        team: {
          id: 'team-1',
          name: 'Team One',
          visibility: true,
          competition: {
            id: 'comp-1',
            competition_id: '1',
            name: 'Hackathon 2026',
            category: 'Web3',
            registration_window: new Date('2026-12-01'),
            submission_deadline: new Date('2026-12-10'),
            pirze_certificate_claim: new Date('2026-12-15'),
          },
          _count: { team_roles: 3 },
        },
      },
    ];

    const mockTeams = [
      {
        id: 'team-2',
        name: 'Team Two',
        user_id: 'user-1',
        competition_id: 'comp-2',
        competition: {
          id: 'comp-2',
          competition_id: '2',
          name: 'AI Challenge',
          category: 'AI',
          registration_window: new Date('2026-12-01'),
          submission_deadline: new Date('2026-12-10'),
          pirze_certificate_claim: new Date('2026-12-15'),
        },
        request_joins: [
          {
            id: 'req-1',
            user_id: 'user-1',
            status: 'pending',
            user: {
              id: 'user-1',
              username: 'testuser',
              email: 'test@example.com',
              wallet_address: '0x123',
            },
          },
        ],
      },
    ];

    mockPrisma.teamRole.findMany.mockResolvedValue(mockMemberships);
    mockPrisma.team.findMany.mockResolvedValue(mockTeams);

    const result = await service.getForUser('user-1');

    expect(result).toBeDefined();
    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0]).toEqual({
      teamId: 'team-1',
      teamName: 'Team One',
      visibility: 'public',
      role: 'leader',
      memberCount: 3,
      competition: {
        id: 'comp-1',
        competition_id: '1',
        title: 'Hackathon 2026',
        category: 'Web3',
        registrationEndsAt: new Date('2026-12-01'),
        submissionDeadline: new Date('2026-12-10'),
      },
    });

    expect(result.pendingRequests).toHaveLength(1);
    expect(result.pendingRequests[0]).toEqual({
      requestId: 'req-1',
      teamId: 'team-2',
      teamName: 'Team Two',
      competitionId: 'comp-2',
      competitionSlug: '2',
      competitionTitle: 'AI Challenge',
    });
  });
});
