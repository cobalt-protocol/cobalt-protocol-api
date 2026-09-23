import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateTeamDto } from './dto/create-team.dto.js';
import type { TeamQueryDto } from './dto/team-query.dto.js';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  private async retrySerializable<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        )
          continue;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2034'].includes(error.code)
        )
          throw new ConflictException(
            'Team state changed. Refresh and try again.',
          );
        throw error;
      }
    }
    throw new ConflictException('Team state changed. Refresh and try again.');
  }

  async create(slug: string, userId: string, dto: CreateTeamDto) {
    return this.retrySerializable(async (tx) => {
      const competition = await tx.competition.findFirst({
        where: { slug, publication_status: 'PUBLISHED', deleted_at: null },
      });
      if (!competition) throw new NotFoundException('Competition not found');
      if (competition.registration_window <= new Date())
        throw new ConflictException('Registration is closed');
      const [user, existing] = await Promise.all([
        tx.user.findFirst({
          where: { id: userId, deleted_at: null },
          select: {
            username: true,
            email: true,
            skill: { select: { id: true } },
          },
        }),
        tx.teamRole.findFirst({
          where: { user_id: userId, competition_id: competition.id },
        }),
      ]);
      if (!user?.username || !user.email || !user.skill)
        throw new ConflictException('Complete your profile before joining');
      if (existing)
        throw new ConflictException(
          'You already belong to a team in this competition',
        );
      const team = await tx.team.create({
        data: {
          name: dto.name.trim(),
          visibility: dto.visibility === 'public',
          description: dto.requirements?.trim() ?? '',
          competition_id: competition.id,
          user_id: userId,
          skills_suggestions: {
            create: (dto.roles ?? [])
              .map((name) => ({ name: name.trim() }))
              .filter((role) => role.name),
          },
        },
      });
      await tx.teamRole.create({
        data: {
          team_id: team.id,
          user_id: userId,
          competition_id: competition.id,
          role: 'LEAD',
        },
      });
      return {
        id: team.id,
        competitionSlug: slug,
        name: team.name,
        visibility: dto.visibility,
        role: 'lead',
      };
    });
  }

  async listPublic(slug: string, query: TeamQueryDto) {
    const competition = await this.prisma.competition.findFirst({
      where: { slug, publication_status: 'PUBLISHED', deleted_at: null },
    });
    if (!competition) throw new NotFoundException('Competition not found');
    const search = query.query?.trim();
    const where: Prisma.TeamWhereInput = {
      competition_id: competition.id,
      visibility: true,
      deleted_at: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            skills_suggestions: {
              some: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      }),
    };
    const [total, data] = await Promise.all([
      this.prisma.team.count({ where }),
      this.prisma.team.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { username: true } },
          skills_suggestions: { select: { name: true } },
          _count: { select: { team_roles: true } },
        },
      }),
    ]);
    return {
      data: data.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        lead: team.user.username,
        roles: team.skills_suggestions.map((role) => role.name),
        memberCount: team._count.team_roles,
        maxTeamSize: competition.max_team_size,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async requestJoin(teamId: string, userId: string) {
    return this.retrySerializable(async (tx) => {
      const team = await tx.team.findFirst({
        where: { id: teamId, deleted_at: null },
        include: {
          competition: true,
          _count: { select: { team_roles: true } },
        },
      });
      if (!team) throw new NotFoundException('Team not found');
      if (!team.visibility)
        throw new ForbiddenException('Private teams require an invite');
      if (
        team.competition.publication_status !== 'PUBLISHED' ||
        team.competition.registration_window <= new Date()
      )
        throw new ConflictException('Registration is closed');
      if (team._count.team_roles >= team.competition.max_team_size)
        throw new ConflictException('Team is full');
      const existing = await tx.teamRole.findFirst({
        where: { user_id: userId, competition_id: team.competition_id },
      });
      if (existing)
        throw new ConflictException(
          'You already belong to a team in this competition',
        );
      const request = await tx.teamJoinRequest.findUnique({
        where: {
          competition_id_user_id: {
            competition_id: team.competition_id,
            user_id: userId,
          },
        },
      });
      if (request)
        throw new ConflictException(
          'You already requested a team in this competition',
        );
      return tx.teamJoinRequest.create({
        data: {
          team_id: team.id,
          competition_id: team.competition_id,
          user_id: userId,
        },
      });
    });
  }

  async listRequests(teamId: string, leadId: string) {
    await this.requireLead(teamId, leadId);
    return this.prisma.teamJoinRequest.findMany({
      where: { team_id: teamId, status: 'PENDING' },
      select: {
        id: true,
        created_at: true,
        user: {
          select: {
            id: true,
            username: true,
            skill: { select: { skill_name: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async decide(
    teamId: string,
    requestId: string,
    leadId: string,
    accept: boolean,
  ) {
    return this.retrySerializable(async (tx) => {
      const team = await tx.team.findFirst({
        where: { id: teamId, deleted_at: null },
        include: {
          competition: true,
          _count: { select: { team_roles: true } },
        },
      });
      if (!team) throw new NotFoundException('Team not found');
      if (team.user_id !== leadId)
        throw new ForbiddenException('Only team lead can decide requests');
      const request = await tx.teamJoinRequest.findFirst({
        where: { id: requestId, team_id: teamId, status: 'PENDING' },
      });
      if (!request) throw new NotFoundException('Pending request not found');
      if (accept) {
        if (team._count.team_roles >= team.competition.max_team_size)
          throw new ConflictException('Team is full');
        if (team.competition.registration_window <= new Date())
          throw new ConflictException('Registration is closed');
        await tx.teamRole.create({
          data: {
            team_id: teamId,
            user_id: request.user_id,
            competition_id: team.competition_id,
            role: 'MEMBER',
          },
        });
      }
      return tx.teamJoinRequest.update({
        where: { id: requestId },
        data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
        select: { id: true, status: true },
      });
    });
  }

  private async requireLead(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
      select: { user_id: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.user_id !== userId)
      throw new ForbiddenException('Only team lead can view requests');
  }
}
