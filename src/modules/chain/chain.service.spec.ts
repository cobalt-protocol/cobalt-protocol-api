import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ChainService } from './chain.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ChainService', () => {
  let service: ChainService;

  const mockPrismaService = {
    competition: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    skillDescriptionUser: {
      upsert: vi.fn(),
    },
    socialMediaUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    skillUser: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    }),
    team: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    teamRole: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    teamCode: {
      findFirst: vi.fn(),
    },
    requestJoin: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
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
          prize_deposits: [],
          teams: [
            {
              id: '01J8Z9TEAM000000000000001',
              name: 'Alpha Team',
              visibility: true,
              deleted_at: null,
            },
          ],
        },
      ];

      mockPrismaService.competition.findMany.mockResolvedValue(
        mockCompetitions,
      );
      mockPrismaService.team.findMany.mockResolvedValue([
        {
          id: '01J8Z9TEAM000000000000001',
          competition_id: '01J8Z9X0000000000000000001',
          _count: {
            team_roles: 3,
          },
        },
      ]);

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
          prize_deposits: {
            where: {
              deleted_at: null,
            },
            orderBy: {
              created_at: 'desc',
            },
          },
          indexer_state: true,
          teams: {
            where: {
              deleted_at: null,
              visibility: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith({
        where: {
          competition_id: { in: ['01J8Z9X0000000000000000001'] },
          deleted_at: null,
        },
        select: {
          id: true,
          competition_id: true,
          _count: {
            select: {
              team_roles: {
                where: {
                  deleted_at: null,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual({
        data: [
          {
            ...mockCompetitions[0],
            total_teams: 1,
            total_participant: 3,
          },
        ],
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

  describe('getCompetitionByChainIdAndId', () => {
    it('should return a competition for the given chain_id and id', async () => {
      const mockCompetition = {
        id: '01J8Z9X0000000000000000001',
        competition_id: '1',
        name: 'Cobalt Hackathon 2026',
        indexer_state: {
          chain_id: 11155111,
        },
        prize_winners: [],
        prize_deposits: [],
      };

      mockPrismaService.competition.findFirst.mockResolvedValue(
        mockCompetition,
      );

      const result = await service.getCompetitionByChainIdAndId(
        11155111,
        '01J8Z9X0000000000000000001',
      );

      expect(mockPrismaService.competition.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: '01J8Z9X0000000000000000001' },
            { competition_id: '01J8Z9X0000000000000000001' },
          ],
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
          prize_deposits: {
            where: {
              deleted_at: null,
            },
            orderBy: {
              created_at: 'desc',
            },
          },
          indexer_state: true,
        },
      });

      expect(result).toEqual({
        data: mockCompetition,
        message: 'Competition retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException when competition is not found', async () => {
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(
        service.getCompetitionByChainIdAndId(11155111, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });


  describe('updateProfile', () => {
    const mockUser = {
      id: 'user-1',
      wallet_address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
      username: 'oldname',
      email: 'old@example.com',
      location: 'Old City',
      institution: 'Old Inst',
      organizations: [],
      skill_description: null,
      social_media: null,
      skills: [],
    };

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-unknown', 968, { username: 'newname' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user fields and related records successfully', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({
          ...mockUser,
          username: 'newname',
          email: 'new@example.com',
          location: 'New City',
          institution: 'New Inst',
          skill_description: { description: 'Web3 Builder' },
          social_media: {
            github_link: 'https://github.com/new',
            linkedin_link: 'https://linkedin.com/in/new',
          },
          skills: [{ skill_name: 'Solidity' }, { skill_name: 'Rust' }],
        });

      mockPrismaService.socialMediaUser.findUnique.mockResolvedValue(null);

      const dto = {
        username: 'newname',
        email: 'new@example.com',
        location: 'New City',
        institution: 'New Inst',
        pitch: 'Web3 Builder',
        github_link: 'https://github.com/new',
        linkedin_link: 'https://linkedin.com/in/new',
        skills: [
          { name: 'Solidity', level: 'Expert' },
          { name: 'Rust', level: 'Intermediate' },
        ],
      };

      const result = await service.updateProfile('user-1', 968, dto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          username: 'newname',
          email: 'new@example.com',
          location: 'New City',
          institution: 'New Inst',
        },
      });

      expect(mockPrismaService.skillDescriptionUser.upsert).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        create: { user_id: 'user-1', description: 'Web3 Builder' },
        update: { description: 'Web3 Builder' },
      });

      expect(mockPrismaService.socialMediaUser.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          github_link: 'https://github.com/new',
          linkedin_link: 'https://linkedin.com/in/new',
        },
      });

      expect(mockPrismaService.skillUser.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
      });

      expect(mockPrismaService.skillUser.createMany).toHaveBeenCalledWith({
        data: [
          { user_id: 'user-1', skill_name: 'Solidity' },
          { user_id: 'user-1', skill_name: 'Rust' },
        ],
      });

      expect(result.data.user.username).toBe('newname');
      expect(result.data.user.role).toBe('user');
      expect(result.message).toBe('Profile updated successfully');
    });

    it('should assign role organization if user has organizations', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({
          ...mockUser,
          organizations: [{ id: 'org-1', name: 'Cobalt Labs' }],
        });

      const result = await service.updateProfile('user-1', 968, { username: 'orguser' });

      expect(result.data.user.role).toBe('organization');
      expect(result.data.user.organization).toEqual({ id: 'org-1', name: 'Cobalt Labs' });
    });
  });

  describe('createTeam', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTeam('user-1', 11155111, 'comp-1', {
          name: 'Team 1',
          visibility: true,
          description: 'Team Desc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if competition not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(
        service.createTeam('user-1', 11155111, 'comp-1', {
          name: 'Team 1',
          visibility: true,
          description: 'Team Desc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create team and return team data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-uuid-1',
        competition_id: 'comp-1',
      });

      const mockCreatedTeam = {
        id: 'team-1',
        name: 'Team 1',
        visibility: false,
        description: 'Team Desc',
        competition_id: 'comp-uuid-1',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        team_codes: [{ code: 'COBALT-ABC12' }],
        skills_team: [{ name: 'Solidity' }],
        requirements_team: { requirement: 'Team Desc' },
        team_roles: [{ user_id: 'user-1', role: 'LEAD' }],
      };

      mockPrismaService.team.create.mockResolvedValue(mockCreatedTeam);

      const result = await service.createTeam('user-1', 11155111, 'comp-1', {
        name: 'Team 1',
        visibility: false,
        description: 'Team Desc',
        skills_team: ['Solidity'],
      });

      expect(mockPrismaService.team.create).toHaveBeenCalled();
      expect(result.data.id).toBe('team-1');
      expect(result.data.team_roles).toEqual([
        { user_id: 'user-1', role: 'LEAD' },
      ]);
      expect(result.message).toBe('Team created successfully');
    });
  });

  describe('getUserTeamsByChainId', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getUserTeamsByChainId('user-1', 11155111),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return team roles with calculated total and token for given user and chain ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      const mockTeamRoles = [
        {
          id: 'tr-1',
          role: 'LEAD',
          user_id: 'user-1',
          team: {
            id: 'team-1',
            name: 'Cobalt Team',
            competition: { 
              id: 'comp-1', 
              indexer_state: { chain_id: 11155111 },
              fee_token_address: '0xabc123',
              prize_winners: [
                { amount: 1000 },
                { amount: 500 },
              ],
              prize_deposits: [
                { token_address: '0xabc123' }
              ]
            },
          },
        },
      ];
      mockPrismaService.teamRole.findMany.mockResolvedValue(mockTeamRoles);

      const result = await service.getUserTeamsByChainId('user-1', 11155111);

      expect(mockPrismaService.teamRole.findMany).toHaveBeenCalled();
      expect(result.data[0].team.competition.total).toBe(1500);
      expect(result.data[0].team.competition.token).toBe('0xabc123');
      expect(result.message).toBe('User teams retrieved successfully');
    });
  });

  describe('joinTeamByCode', () => {
    const dto = { team_code: 'COBALT-ABC12' };

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.joinTeamByCode('user-1', 11155111, 'comp-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if competition not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue(null);

      await expect(
        service.joinTeamByCode('user-1', 11155111, 'comp-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if team code not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-uuid-1',
        competition_id: 'comp-1',
        formation: '1-3',
      });
      mockPrismaService.teamCode.findFirst.mockResolvedValue(null);

      await expect(
        service.joinTeamByCode('user-1', 11155111, 'comp-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when code belongs to another competition', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-uuid-1',
        competition_id: 'comp-1',
        formation: '1-3',
      });
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABC12',
        team: {
          id: 'team-1',
          name: 'Other Team',
          competition_id: 'comp-uuid-2',
          deleted_at: null,
        },
      });

      await expect(
        service.joinTeamByCode('user-1', 11155111, 'comp-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-uuid-1',
        competition_id: 'comp-1',
        formation: '1-3',
      });
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABC12',
        team: {
          id: 'team-1',
          name: 'My Team',
          competition_id: 'comp-uuid-1',
          deleted_at: null,
        },
      });
      mockPrismaService.teamRole.count.mockResolvedValue(1);
      mockPrismaService.teamRole.findFirst.mockResolvedValue({ id: 'tr-1' });

      await expect(
        service.joinTeamByCode('user-1', 11155111, 'comp-1', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when team is full', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-uuid-1',
        competition_id: 'comp-1',
        formation: '1-3',
      });
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABC12',
        team: {
          id: 'team-1',
          name: 'My Team',
          competition_id: 'comp-uuid-1',
          deleted_at: null,
        },
      });
      mockPrismaService.teamRole.count.mockResolvedValue(3);
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);

      await expect(
        service.joinTeamByCode('user-1', 11155111, 'comp-1', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a team role and return success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.competition.findFirst.mockResolvedValue({
        id: 'comp-uuid-1',
        competition_id: 'comp-1',
        formation: '1-3',
      });
      mockPrismaService.teamCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'COBALT-ABC12',
        team: {
          id: 'team-1',
          name: 'My Team',
          competition_id: 'comp-uuid-1',
          deleted_at: null,
        },
      });
      mockPrismaService.teamRole.count.mockResolvedValue(2);
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.teamRole.create.mockResolvedValue({
        id: 'tr-new',
        role: 'MEMBER',
        team_id: 'team-1',
        user_id: 'user-1',
      });

      const result = await service.joinTeamByCode(
        'user-1',
        11155111,
        'comp-1',
        dto,
      );

      expect(mockPrismaService.teamRole.create).toHaveBeenCalledWith({
        data: {
          team_id: 'team-1',
          user_id: 'user-1',
          role: 'MEMBER',
        },
      });
      expect(result.data.max_team_size).toBe(3);
      expect(result.data.member_count).toBe(3);
      expect(result.message).toBe('Joined team successfully');
    });
  });
});


