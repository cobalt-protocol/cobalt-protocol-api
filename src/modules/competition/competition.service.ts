import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { Prisma, type Competition } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCompetitionTeamDto } from '../../competition/dto/create-team.dto.js';
import type { CompetitionQueryDto } from './dto/competition-query.dto.js';

@Injectable()
export class CompetitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

  async createTeam(
    id: string,
    authHeader: string | undefined,
    dto: CreateCompetitionTeamDto,
  ) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload.sub ?? null;
    const walletAddress = payload.wallet_address ?? null;

    if (!userId && !walletAddress) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(walletAddress
            ? [
                {
                  wallet_address: {
                    equals: walletAddress,
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }, { slug: id }],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const isPublic = Boolean(dto.visibility);
    const teamCodeStr = isPublic
      ? `COBALT-${randomBytes(5).toString('hex').toUpperCase()}`
      : null;

    const skillsList =
      dto.skills ?? dto.skills_suggestion ?? dto.skills_suggestions ?? [];

    const teamName =
      dto.name && dto.name.trim()
        ? dto.name.trim()
        : `Team ${randomBytes(3).toString('hex').toUpperCase()}`;

    const team = await this.prisma.team.create({
      data: {
        name: teamName,
        visibility: isPublic,
        description: dto.description ? dto.description.trim() : '',
        competition_id: competition.id,
        user_id: user.id,
        skills_suggestions: {
          create: skillsList
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter((name) => name.length > 0)
            .map((name) => ({ name })),
        },
        ...(isPublic && teamCodeStr
          ? {
              team_codes: {
                create: [
                  {
                    code: teamCodeStr,
                  },
                ],
              },
            }
          : {}),
        team_roles: {
          create: [
            {
              user_id: user.id,
              competition_id: competition.id,
              role: 'LEAD',
            },
          ],
        },
      },
      include: {
        skills_suggestions: true,
        team_codes: true,
        team_roles: true,
      },
    });

    return {
      data: {
        id: team.id,
        name: team.name,
        visibility: team.visibility,
        description: team.description,
        competition_id: team.competition_id,
        user_id: team.user_id,
        team_code: teamCodeStr,
        team_codes: team.team_codes,
        skills_suggestions: team.skills_suggestions,
        created_at: team.created_at,
        updated_at: team.updated_at,
      },
      message: 'Team created successfully',
      errors: null,
    };
  }
}
