import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CompetitionPublicationStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrganizerCompetitionService } from './organizer-competition.service.js';

describe('OrganizerCompetitionService', () => {
  const now = new Date('2026-10-01T00:00:00.000Z');
  const baseCompetition = {
    id: 'competition-12345678',
    slug: null,
    publication_status: CompetitionPublicationStatus.DRAFT,
    name: 'Cobalt Buildathon',
    category: 'Web3',
    description: 'Build useful things',
    requirement: 'Working prototype',
    max_team_size: 5,
    registration_window: now,
    competition_window: new Date('2026-10-02T00:00:00.000Z'),
    submission_deadline: new Date('2026-10-03T00:00:00.000Z'),
    judging_review: new Date('2026-10-04T00:00:00.000Z'),
    result_announcement: new Date('2026-10-05T00:00:00.000Z'),
    pirze_certificate_claim: new Date('2026-10-05T00:00:00.000Z'),
    guidebook_cid: '',
    certificate_cid: '',
    organization_id: 'organization-a',
    organization: { id: 'organization-a', name: 'Organizer A' },
    _count: { teams: 0 },
    created_at: now,
    updated_at: null,
    deleted_at: null,
  };
  const prisma = {
    organization: { findFirst: vi.fn() },
    competition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const service = new OrganizerCompetitionService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('requires an organization before creating organizer data', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);
    await expect(
      service.create('participant-user', {
        title: 'Buildathon',
        category: 'Web3',
        description: 'Description',
        requirements: 'Prototype',
        registrationEndsAt: '2026-10-01T00:00:00.000Z',
        startsAt: '2026-10-02T00:00:00.000Z',
        submissionDeadline: '2026-10-03T00:00:00.000Z',
        judgingEndsAt: '2026-10-04T00:00:00.000Z',
        resultsAt: '2026-10-05T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.competition.create).not.toHaveBeenCalled();
  });

  it('does not reveal a competition owned by another organizer', async () => {
    prisma.organization.findFirst.mockResolvedValue({ id: 'organization-b' });
    prisma.competition.findFirst.mockResolvedValue(null);
    await expect(
      service.detail('organizer-b', baseCompetition.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.competition.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization: { user_id: 'organizer-b', deleted_at: null },
        }),
      }),
    );
  });

  it('rejects an invalid timeline when publishing', async () => {
    prisma.organization.findFirst.mockResolvedValue({ id: 'organization-a' });
    prisma.competition.findFirst.mockResolvedValue({
      ...baseCompetition,
      submission_deadline: new Date('2026-09-30T00:00:00.000Z'),
    });
    await expect(
      service.publish('organizer-a', baseCompetition.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.competition.update).not.toHaveBeenCalled();
  });

  it('publishes an owned draft with a stable unique slug', async () => {
    prisma.organization.findFirst.mockResolvedValue({ id: 'organization-a' });
    prisma.competition.findFirst.mockResolvedValue(baseCompetition);
    prisma.competition.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseCompetition,
        ...data,
      }),
    );

    const result = await service.publish('organizer-a', baseCompetition.id);

    expect(prisma.competition.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseCompetition.id },
        data: {
          slug: 'cobalt-buildathon-competit',
          publication_status: CompetitionPublicationStatus.PUBLISHED,
        },
      }),
    );
    expect(result.status).toBe(CompetitionPublicationStatus.PUBLISHED);
  });
});
