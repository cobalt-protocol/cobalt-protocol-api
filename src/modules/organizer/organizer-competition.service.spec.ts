import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrganizerCompetitionService } from './organizer-competition.service.js';

describe('OrganizerCompetitionService', () => {
  const now = new Date('2026-10-01T00:00:00.000Z');
  const baseCompetition = {
    id: 'competition-12345678',
    competition_id: 'comp-uuid-12345678',
    user_id: 'organizer-a',
    tx_hash: '0x0000000000000000000000000000000000000000',
    token_address: '0x0000000000000000000000000000000000000000',
    name: 'Cobalt Buildathon',
    category: 'Web3',
    description: 'Build useful things',
    requirement: 'Working prototype',
    formation: '',
    registration_window: now,
    competition_window: new Date('2026-10-02T00:00:00.000Z'),
    submission_deadline: new Date('2026-10-03T00:00:00.000Z'),
    judging_review: new Date('2026-10-04T00:00:00.000Z'),
    result_announcement: new Date('2026-10-05T00:00:00.000Z'),
    pirze_certificate_claim: new Date('2026-10-05T00:00:00.000Z'),
    guidebook_cid: '',
    certificate_cid: '',
    _count: { teams: 0 },
    created_at: now,
    updated_at: null,
    deleted_at: null,
  };
  const prisma = {
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

  it('creates competition for user', async () => {
    prisma.competition.create.mockResolvedValue(baseCompetition);
    const result = await service.create('organizer-a', {
      title: 'Cobalt Buildathon',
      category: 'Web3',
      description: 'Build useful things',
      requirements: 'Working prototype',
      registrationEndsAt: '2026-10-01T00:00:00.000Z',
      startsAt: '2026-10-02T00:00:00.000Z',
      submissionDeadline: '2026-10-03T00:00:00.000Z',
      judgingEndsAt: '2026-10-04T00:00:00.000Z',
      resultsAt: '2026-10-05T00:00:00.000Z',
    });

    expect(prisma.competition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: 'organizer-a',
          name: 'Cobalt Buildathon',
        }),
      }),
    );
    expect(result.title).toBe('Cobalt Buildathon');
  });

  it('does not reveal a competition owned by another organizer', async () => {
    prisma.competition.findFirst.mockResolvedValue(null);
    await expect(
      service.detail('organizer-b', baseCompetition.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.competition.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: baseCompetition.id,
          user_id: 'organizer-b',
          deleted_at: null,
        }),
      }),
    );
  });

  it('rejects an invalid timeline when publishing', async () => {
    prisma.competition.findFirst.mockResolvedValue({
      ...baseCompetition,
      submission_deadline: new Date('2026-09-30T00:00:00.000Z'),
    });
    await expect(
      service.publish('organizer-a', baseCompetition.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('publishes an owned competition with valid timeline', async () => {
    prisma.competition.findFirst.mockResolvedValue(baseCompetition);

    const result = await service.publish('organizer-a', baseCompetition.id);

    expect(result.status).toBe('PUBLISHED');
    expect(result.title).toBe('Cobalt Buildathon');
  });
});
