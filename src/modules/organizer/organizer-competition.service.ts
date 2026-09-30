import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateOrganizerCompetitionDto } from './dto/create-organizer-competition.dto.js';
import type { OrganizerCompetitionQueryDto } from './dto/organizer-competition-query.dto.js';
import type { UpdateOrganizerCompetitionDto } from './dto/update-organizer-competition.dto.js';

const organizerInclude = {
  _count: { select: { teams: true } },
} satisfies Prisma.CompetitionInclude;

type OrganizerCompetition = Prisma.CompetitionGetPayload<{
  include: typeof organizerInclude;
}>;

@Injectable()
export class OrganizerCompetitionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizerCompetitionDto) {
    const entry = await this.prisma.competition.create({
      data: {
        tx_hash: '0x0000000000000000000000000000000000000000',
        token_address: '0x0000000000000000000000000000000000000000',
        competition_id: crypto.randomUUID(),
        user_id: userId,
        name: dto.title.trim(),
        category: dto.category.trim(),
        description: dto.description.trim(),
        requirement: dto.requirements.trim(),
        formation: dto.formation?.trim() ?? '',
        registration_window: new Date(dto.registrationEndsAt),
        competition_window: new Date(dto.startsAt),
        submission_deadline: new Date(dto.submissionDeadline),
        judging_review: new Date(dto.judgingEndsAt),
        result_announcement: new Date(dto.resultsAt),
        pirze_certificate_claim: new Date(dto.resultsAt),
        guidebook_cid: dto.guidebookCid?.trim() ?? '',
        certificate_cid: dto.certificateCid?.trim() ?? '',
      },
      include: organizerInclude,
    });
    return this.present(entry);
  }

  async list(userId: string, query: OrganizerCompetitionQueryDto) {
    const where: Prisma.CompetitionWhereInput = {
      deleted_at: null,
      user_id: userId,
    };
    const [total, entries] = await Promise.all([
      this.prisma.competition.count({ where }),
      this.prisma.competition.findMany({
        where,
        include: organizerInclude,
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data: entries.map((entry) => this.present(entry)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(userId: string, id: string) {
    return this.present(await this.findOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateOrganizerCompetitionDto) {
    await this.findOwned(userId, id);
    const entry = await this.prisma.competition.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { name: dto.title.trim() }),
        ...this.toData(dto),
      },
      include: organizerInclude,
    });
    return this.present(entry);
  }

  async publish(userId: string, id: string) {
    const current = await this.findOwned(userId, id);
    this.validateForPublish(current);
    return this.present(current);
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.competition.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  private async findOwned(userId: string, id: string) {
    const entry = await this.prisma.competition.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null,
      },
      include: organizerInclude,
    });
    if (!entry) throw new NotFoundException('Competition not found');
    return entry;
  }

  private toData(dto: UpdateOrganizerCompetitionDto) {
    return {
      ...(dto.category !== undefined && { category: dto.category.trim() }),
      ...(dto.description !== undefined && {
        description: dto.description.trim(),
      }),
      ...(dto.requirements !== undefined && {
        requirement: dto.requirements.trim(),
      }),
      ...(dto.formation !== undefined && {
        formation: dto.formation.trim(),
      }),
      ...(dto.registrationEndsAt !== undefined && {
        registration_window: new Date(dto.registrationEndsAt),
      }),
      ...(dto.startsAt !== undefined && {
        competition_window: new Date(dto.startsAt),
      }),
      ...(dto.submissionDeadline !== undefined && {
        submission_deadline: new Date(dto.submissionDeadline),
      }),
      ...(dto.judgingEndsAt !== undefined && {
        judging_review: new Date(dto.judgingEndsAt),
      }),
      ...(dto.resultsAt !== undefined && {
        result_announcement: new Date(dto.resultsAt),
        pirze_certificate_claim: new Date(dto.resultsAt),
      }),
      ...(dto.guidebookCid !== undefined && {
        guidebook_cid: dto.guidebookCid.trim(),
      }),
      ...(dto.certificateCid !== undefined && {
        certificate_cid: dto.certificateCid.trim(),
      }),
    };
  }

  private validateForPublish(entry: OrganizerCompetition) {
    const missing = [
      ['category', entry.category],
      ['description', entry.description],
      ['requirements', entry.requirement],
      ['registrationEndsAt', entry.registration_window],
      ['startsAt', entry.competition_window],
      ['submissionDeadline', entry.submission_deadline],
      ['judgingEndsAt', entry.judging_review],
      ['resultsAt', entry.result_announcement],
    ]
      .filter(([, value]) => value === null || value === '')
      .map(([field]) => field);
    if (missing.length)
      throw new ConflictException(
        `Complete required fields before publishing: ${missing.join(', ')}`,
      );

    const timeline = [
      entry.registration_window!,
      entry.competition_window!,
      entry.submission_deadline!,
      entry.judging_review!,
      entry.result_announcement!,
    ];
    if (
      timeline.some((date, index) => index > 0 && date <= timeline[index - 1])
    )
      throw new ConflictException(
        'Timeline must be strictly ordered from registration through results',
      );
  }

  private present(entry: OrganizerCompetition) {
    return {
      id: entry.id,
      competition_id: entry.competition_id,
      status: 'PUBLISHED',
      title: entry.name,
      category: entry.category,
      description: entry.description,
      requirements: entry.requirement,
      formation: entry.formation,
      maxTeamSize: 5,
      registrationEndsAt: entry.registration_window,
      startsAt: entry.competition_window,
      submissionDeadline: entry.submission_deadline,
      judgingEndsAt: entry.judging_review,
      resultsAt: entry.result_announcement,
      guidebookCid: entry.guidebook_cid,
      certificateCid: entry.certificate_cid,
      organization: null,
      teamCount: entry._count.teams,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    };
  }
}
