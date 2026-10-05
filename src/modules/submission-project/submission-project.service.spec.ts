import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSubmissionProjectDto } from './dto/create-submission-project.dto.js';
import { SubmissionProjectService } from './submission-project.service.js';

describe('SubmissionProjectService', () => {
  let service: SubmissionProjectService;
  let mockPrismaService: any;

  beforeEach(() => {
    mockPrismaService = {
      team: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      teamRole: {
        findFirst: vi.fn(),
      },
      submissionProject: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new SubmissionProjectService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  const mockDto: CreateSubmissionProjectDto = {
    title: 'Awesome Web3 App',
    description: 'A revolutionary dApp built for Cobalt Protocol',
    submission_link: 'https://github.com/cobalt/awesome-app',
    document_cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  };

  describe('getSubmission', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.getSubmission('non-existent-team-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not in team_role and not team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-user-id',
        deleted_at: null,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'non-member-id',
        wallet_address: '0x123',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);

      await expect(
        service.getSubmission('team-1', 'non-member-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if submission does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-user-id',
        deleted_at: null,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'member-user-id',
        wallet_address: '0x456',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'member-user-id',
        role: 'member',
        deleted_at: null,
      });
      mockPrismaService.submissionProject.findFirst.mockResolvedValue(null);

      await expect(
        service.getSubmission('team-1', 'member-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return submission when user is a team member in team_role', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-user-id',
        deleted_at: null,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'member-user-id',
        wallet_address: '0x456',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'member-user-id',
        role: 'member',
        deleted_at: null,
      });
      mockPrismaService.submissionProject.findFirst.mockResolvedValue({
        id: 'sub-1',
        team_id: 'team-1',
        ...mockDto,
      });

      const result = await service.getSubmission('team-1', 'member-user-id');

      expect(result.data.id).toBe('sub-1');
      expect(result.message).toBe('Project submission retrieved successfully');
    });
  });

  describe('createSubmission', () => {
    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.createSubmission('non-existent-team-id', 'user-1', mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not in team_role and not team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-user-id',
        deleted_at: null,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'non-member-id',
        wallet_address: '0x123',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);

      await expect(
        service.createSubmission('team-1', 'non-member-id', mockDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create new submission when user is a team member in team_role', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-user-id',
        deleted_at: null,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'member-user-id',
        wallet_address: '0x456',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue({
        id: 'role-1',
        team_id: 'team-1',
        user_id: 'member-user-id',
        role: 'member',
        deleted_at: null,
      });
      mockPrismaService.submissionProject.findFirst.mockResolvedValue(null);
      mockPrismaService.submissionProject.create.mockResolvedValue({
        id: 'sub-1',
        team_id: 'team-1',
        ...mockDto,
        created_at: new Date(),
        updated_at: null,
        deleted_at: null,
      });

      const result = await service.createSubmission(
        'team-1',
        'member-user-id',
        mockDto,
      );

      expect(result.data.id).toBe('sub-1');
      expect(result.message).toBe('Project submission created successfully');
      expect(mockPrismaService.submissionProject.create).toHaveBeenCalledWith({
        data: {
          title: mockDto.title,
          description: mockDto.description,
          submission_link: mockDto.submission_link,
          document_cid: mockDto.document_cid,
          team_id: 'team-1',
        },
      });
    });

    it('should update existing submission when user is the team leader', async () => {
      mockPrismaService.team.findFirst.mockResolvedValue({
        id: 'team-1',
        user_id: 'leader-user-id',
        deleted_at: null,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'leader-user-id',
        wallet_address: '0x789',
      });
      mockPrismaService.teamRole.findFirst.mockResolvedValue(null);
      mockPrismaService.submissionProject.findFirst.mockResolvedValue({
        id: 'existing-sub-id',
        team_id: 'team-1',
        title: 'Old Title',
      });
      mockPrismaService.submissionProject.update.mockResolvedValue({
        id: 'existing-sub-id',
        team_id: 'team-1',
        ...mockDto,
        updated_at: new Date(),
      });

      const result = await service.createSubmission(
        'team-1',
        'leader-user-id',
        mockDto,
      );

      expect(result.data.id).toBe('existing-sub-id');
      expect(mockPrismaService.submissionProject.update).toHaveBeenCalledWith({
        where: { id: 'existing-sub-id' },
        data: {
          title: mockDto.title,
          description: mockDto.description,
          submission_link: mockDto.submission_link,
          document_cid: mockDto.document_cid,
        },
      });
    });
  });
});
