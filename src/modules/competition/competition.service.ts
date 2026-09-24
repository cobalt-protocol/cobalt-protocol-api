import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Competition } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CompetitionQueryDto } from './dto/competition-query.dto.js';

@Injectable()
export class CompetitionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CompetitionQueryDto) {
    const search = query.query?.trim();
    const where: Prisma.CompetitionWhereInput = {
      deleted_at: null,
      publication_status: 'PUBLISHED',
      ...(query.category && { category: query.category }),
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ] }),
    };
    const [total, entries] = await Promise.all([
      this.prisma.competition.count({ where }),
      this.prisma.competition.findMany({
        where, skip: (query.page - 1) * query.limit, take: query.limit,
        orderBy: query.sort === 'deadline' ? { registration_window: 'asc' } : { created_at: 'desc' },
        include: { _count: { select: { teams: true } } },
      }),
    ]);
    return { data: entries.map(this.present), meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  async detail(slug: string) {
    const entry = await this.prisma.competition.findFirst({
      where: { slug, publication_status: 'PUBLISHED', deleted_at: null },
      include: { _count: { select: { teams: true } } },
    });
    if (!entry) throw new NotFoundException('Competition not found');
    return this.present(entry);
  }

  private present(entry: Competition & { _count: { teams: number } }) {
    return {
      id: entry.id, slug: entry.slug, title: entry.name, category: entry.category,
      description: entry.description, requirements: entry.requirement,
      maxTeamSize: entry.max_team_size, registrationEndsAt: entry.registration_window,
      startsAt: entry.competition_window, endsAt: entry.submission_deadline,
      teamCount: entry._count.teams, guidebookCid: entry.guidebook_cid,
    };
  }
}
