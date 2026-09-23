import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompetitionPublicationStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateOrganizerCompetitionDto } from './dto/create-organizer-competition.dto.js';
import type { OrganizerCompetitionQueryDto } from './dto/organizer-competition-query.dto.js';
import type { UpdateOrganizerCompetitionDto } from './dto/update-organizer-competition.dto.js';

const organizerInclude = {
  organization: { select: { id: true, name: true } },
  _count: { select: { teams: true } },
} satisfies Prisma.CompetitionInclude;

type OrganizerCompetition = Prisma.CompetitionGetPayload<{
  include: typeof organizerInclude;
}>;

@Injectable()
export class OrganizerCompetitionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizerCompetitionDto) {
    const organization = await this.prisma.organization.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    if (!organization)
      throw new ForbiddenException('An organizer organization is required');

    const entry = await this.prisma.competition.create({
      data: {
        tx_hash: '0x0000000000000000000000000000000000000000',
        token_address: '0x0000000000000000000000000000000000000000',
        competition_id: crypto.randomUUID(),
        organization_id: organization.id,
        name: dto.title.trim(),
        category: dto.category.trim(),
        description: dto.description.trim(),
        requirement: dto.requirements.trim(),
        max_team_size: dto.maxTeamSize ?? 5,
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
    await this.requireOrganizer(userId);
    const where: Prisma.CompetitionWhereInput = {
      deleted_at: null,
      organization: { user_id: userId, deleted_at: null },
      ...(query.status && { publication_status: query.status }),
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
    const current = await this.findOwned(userId, id);
    if (current.publication_status !== CompetitionPublicationStatus.DRAFT)
      throw new ConflictException('Published competitions cannot be edited');
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
    if (current.publication_status === CompetitionPublicationStatus.PUBLISHED)
      return this.present(current);

    this.validateForPublish(current);
    const slug = this.makeSlug(current.name, current.id);
    const entry = await this.prisma.competition.update({
      where: { id },
      data: {
        slug,
        publication_status: CompetitionPublicationStatus.PUBLISHED,
      },
      include: organizerInclude,
    });
    return this.present(entry);
  }

  private async requireOrganizer(userId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { id: true },
    });
    if (!organization)
      throw new ForbiddenException('An organizer organization is required');
  }

  private async findOwned(
    userId: string,
    id: string,
  ): Promise<OrganizerCompetition> {
    await this.requireOrganizer(userId);
    const entry = await this.prisma.competition.findFirst({
      where: {
        id,
        deleted_at: null,
        organization: { user_id: userId, deleted_at: null },
      },
      include: organizerInclude,
    });
    if (!entry) throw new NotFoundException('Competition not found');
    return entry;
  }

  private toData(
    dto: CreateOrganizerCompetitionDto | UpdateOrganizerCompetitionDto,
  ) {
    return {
      ...(dto.category !== undefined && { category: dto.category.trim() }),
      ...(dto.description !== undefined && {
        description: dto.description.trim(),
      }),
      ...(dto.requirements !== undefined && {
        requirement: dto.requirements.trim(),
      }),
      ...(dto.maxTeamSize !== undefined && {
        max_team_size: dto.maxTeamSize,
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

  private makeSlug(title: string, id: string) {
    const base = title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 64);
    return `${base || 'competition'}-${id.slice(0, 8)}`;
  }

  private present(entry: OrganizerCompetition) {
    return {
      id: entry.id,
      slug: entry.slug,
      status: entry.publication_status,
      title: entry.name,
      category: entry.category,
      description: entry.description,
      requirements: entry.requirement,
      maxTeamSize: entry.max_team_size,
      registrationEndsAt: entry.registration_window,
      startsAt: entry.competition_window,
      submissionDeadline: entry.submission_deadline,
      judgingEndsAt: entry.judging_review,
      resultsAt: entry.result_announcement,
      guidebookCid: entry.guidebook_cid,
      certificateCid: entry.certificate_cid,
      organization: entry.organization,
      teamCount: entry._count.teams,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    };
  }
}
