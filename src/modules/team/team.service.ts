import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { TeamQueryDto } from './dto/team-query.dto.js';
import { TransferLeadershipDto } from './dto/transfer-leadership.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: TeamQueryDto) {
    const search = query.query?.trim();
    const competitionId = query.competition_id?.trim();

    let compIdFilter: any = undefined;
    if (competitionId) {
      const comp = await this.prisma.competition.findFirst({
        where: {
          OR: [
            { id: competitionId },
            { competition_id: competitionId },
          ],
          deleted_at: null,
        },
      });
      compIdFilter = comp ? comp.id : competitionId;
    }

    const where = {
      visibility: true,
      deleted_at: null,
      ...(compIdFilter && { competition_id: compIdFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [total, teams] = await Promise.all([
      this.prisma.team.count({ where }),
      this.prisma.team.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
        include: {
          competition: {
            select: {
              id: true,
              competition_id: true,
              name: true,
            },
          },
          team_roles: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  wallet_address: true,
                },
              },
            },
          },
          team_codes: true,
          skills_suggestions: true,
        },
      }),
    ]);

    return {
      data: teams,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listPublicByCompetitionId(competitionId: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [
          { id: competitionId },
          { competition_id: competitionId },
        ],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const teams = await this.prisma.team.findMany({
      where: {
        competition_id: competition.id,
        visibility: true,
        deleted_at: null,
      },
      include: {
        skills_suggestions: true,
        team_codes: true,
        team_roles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                wallet_address: true,
                institution: true,
                location: true,
              },
            },
          },
        },
        competition: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      data: teams,
      message: 'Teams retrieved successfully',
      errors: null,
    };
  }

  async listAllByCompetitionId(competitionId: string, userId: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [
          { id: competitionId },
          { competition_id: competitionId },
        ],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const isOwner = Boolean(competition.user_id && competition.user_id === userId);

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the competition owner can view all teams',
      );
    }

    const teams = await this.prisma.team.findMany({
      where: {
        competition_id: competition.id,
        deleted_at: null,
      },
      include: {
        skills_suggestions: true,
        team_codes: true,
        team_roles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                wallet_address: true,
                institution: true,
                location: true,
              },
            },
          },
        },
        competition: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!teams || teams.length === 0) {
      throw new NotFoundException('No teams found for this competition');
    }

    return {
      data: teams,
      message: 'All teams retrieved successfully',
      errors: null,
    };
  }

  async detail(teamId: string, userId?: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
      include: {
        competition: true,
        user: {
          select: {
            id: true,
            username: true,
            wallet_address: true,
          },
        },
        team_roles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                wallet_address: true,
              },
            },
          },
        },
        team_codes: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isMember =
      userId &&
      (team.user_id === userId ||
        team.team_roles.some((role) => role.user_id === userId));

    if (!team.visibility && !isMember) {
      throw new ForbiddenException('Private team access is restricted');
    }

    return {
      data: team,
    };
  }

  async members(teamId: string, userId?: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
      include: {
        team_roles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                wallet_address: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isMember =
      userId &&
      (team.user_id === userId ||
        team.team_roles.some((role) => role.user_id === userId));

    if (!team.visibility && !isMember) {
      throw new ForbiddenException('Private team access is restricted');
    }

    return {
      data: team.team_roles,
    };
  }

  /**
   * Retrieves competition details along with team, team_roles, and team_codes relations by Team ID.
   */
  async getCompetitionByTeamId(teamId: string, userId?: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
      include: {
        competition: {
          include: {
            prize_winners: {
              where: {
                deleted_at: null,
              },
              include: {
                winner: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        wallet_address: true,
                        username: true,
                        email: true,
                        location: true,
                        institution: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        team_roles: {
          include: {
            user: {
              select: {
                id: true,
                wallet_address: true,
                username: true,
                email: true,
                location: true,
                institution: true,
              },
            },
          },
        },
        team_codes: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isMember =
      Boolean(userId) &&
      (team.user_id === userId ||
        team.team_roles.some((role) => role.user_id === userId));

    if (!team.visibility && !isMember) {
      throw new NotFoundException('Team not found');
    }

    if (!team.competition) {
      throw new NotFoundException(
        'Competition associated with this team was not found',
      );
    }

    return {
      data: {
        competition: {
          id: team.competition.id,
          competition_id: team.competition.competition_id,
          name: team.competition.name,
          title: team.competition.name,
          description: team.competition.description,
          requirement: team.competition.requirement,
          category: team.competition.category,
          max_team_size: 5,
          registration_window: team.competition.registration_window,
          competition_window: team.competition.competition_window,
          submission_deadline: team.competition.submission_deadline,
          judging_review: team.competition.judging_review,
          result_announcement: team.competition.result_announcement,
          guidebook_cid: team.competition.guidebook_cid,
          certificate_cid: team.competition.certificate_cid,
          created_at: team.competition.created_at,
          updated_at: team.competition.updated_at,
          prize_winners: (team.competition as any).prize_winners ?? [],
        },
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          visibility: team.visibility,
          competition_id: team.competition_id,
          user_id: team.user_id,
          created_at: team.created_at,
          updated_at: team.updated_at,
        },
        team_roles: team.team_roles,
        team_codes: team.team_codes,
      },
      message: 'Competition details by team ID retrieved successfully',
      errors: null,
    };
  }

  async createInvite(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, user_id: userId, deleted_at: null },
    });

    if (!team) {
      throw new ForbiddenException(
        'Only the team leader can generate invite codes',
      );
    }

    const codeStr = `COBALT-${randomBytes(5).toString('hex').toUpperCase()}`;
    const code = await this.prisma.teamCode.create({
      data: {
        team_id: team.id,
        code: codeStr,
      },
    });

    return { data: code };
  }

  async acceptInvite(teamId: string, inviteId: string, userId: string) {
    const code = await this.prisma.teamCode.findFirst({
      where: {
        OR: [{ id: inviteId }, { code: inviteId }],
        team_id: teamId,
        is_used: false,
      },
      include: { team: true },
    });

    if (!code || !code.team) {
      throw new NotFoundException('Invalid or used invite code');
    }

    const existingRole = await this.prisma.teamRole.findFirst({
      where: { team_id: code.team.id, user_id: userId },
    });

    if (existingRole) {
      throw new BadRequestException('You are already a member of this team');
    }

    await this.prisma.teamCode.update({
      where: { id: code.id },
      data: { is_used: true },
    });

    const role = await this.prisma.teamRole.create({
      data: {
        team_id: code.team.id,
        user_id: userId,
        competition_id: code.team.competition_id,
        role: 'MEMBER',
      },
    });

    return { data: role, message: 'Successfully joined team' };
  }

  async acceptInviteByReference(inviteId: string, userId: string) {
    const code = await this.prisma.teamCode.findFirst({
      where: {
        OR: [{ id: inviteId }, { code: inviteId }],
        is_used: false,
      },
      include: { team: true },
    });

    if (!code || !code.team) {
      throw new NotFoundException('Invalid or used invite code');
    }

    return this.acceptInvite(code.team.id, code.id, userId);
  }

  async create(id: string, userId: string, dto: CreateTeamDto) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }],
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
        user_id: userId,
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
              user_id: userId,
              role: 'LEAD',
            },
          ],
        },
      },
      include: {
        team_codes: true,
        team_roles: true,
      },
    });

    return {
      data: team,
      message: 'Team created successfully',
    };
  }

  async requestJoin(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (!team.visibility) {
      throw new ForbiddenException('Cannot request to join a private team');
    }

    const existingRequest = await this.prisma.teamRole.findFirst({
      where: { team_id: teamId, user_id: userId, deleted_at: null },
    });

    if (existingRequest) {
      throw new ConflictException('Pending join request already exists');
    }

    const request = await this.prisma.teamRole.create({
      data: {
        team_id: teamId,
        user_id: userId,
        role: 'APPLICANT',
      },
    });

    return { data: request, message: 'Join request sent' };
  }

  async listRequests(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, user_id: userId, deleted_at: null },
    });

    if (!team) {
      throw new ForbiddenException(
        'Only the team leader can view join requests',
      );
    }

    const requests = await this.prisma.teamRole.findMany({
      where: { team_id: teamId, role: 'APPLICANT', deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            wallet_address: true,
            skill_description: true,
          },
        },
      },
    });

    return { data: requests };
  }

  async decide(
    teamId: string,
    requestId: string,
    userId: string,
    accept: boolean,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, user_id: userId, deleted_at: null },
    });

    if (!team) {
      throw new ForbiddenException(
        'Only the team leader can manage join requests',
      );
    }

    const joinRequest = await this.prisma.teamRole.findFirst({
      where: { id: requestId, team_id: teamId, role: 'APPLICANT', deleted_at: null },
    });

    if (!joinRequest) {
      throw new NotFoundException('Pending join request not found');
    }

    if (accept) {
      await this.prisma.teamRole.update({
        where: { id: joinRequest.id },
        data: { role: 'MEMBER' },
      });
    } else {
      await this.prisma.teamRole.delete({
        where: { id: joinRequest.id },
      });
    }

    return {
      message: accept ? 'Request accepted' : 'Request rejected',
    };
  }

  async leaveTeam(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.user_id === userId) {
      throw new BadRequestException(
        'Leader cannot leave the team without transferring leadership first',
      );
    }

    await this.prisma.teamRole.deleteMany({
      where: { team_id: teamId, user_id: userId },
    });

    return { message: 'Successfully left the team' };
  }

  async removeMember(teamId: string, memberId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.user_id !== userId) {
      throw new ForbiddenException(
        'Only the team leader can remove members from the team',
      );
    }

    if (memberId === userId) {
      throw new BadRequestException(
        'Leader cannot remove themselves from the team. Transfer leadership first or delete team',
      );
    }

    const memberRole = await this.prisma.teamRole.findFirst({
      where: { team_id: teamId, user_id: memberId },
    });

    if (!memberRole) {
      throw new NotFoundException('Member not found in team');
    }

    await this.prisma.teamRole.deleteMany({
      where: { team_id: teamId, user_id: memberId },
    });

    return { message: 'Member removed successfully' };
  }

  async transferLeadership(
    teamId: string,
    userId: string,
    dto: TransferLeadershipDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, user_id: userId, deleted_at: null },
    });

    if (!team) {
      throw new ForbiddenException(
        'Only current team leader can transfer leadership',
      );
    }

    const newLeaderRole = await this.prisma.teamRole.findFirst({
      where: { team_id: teamId, user_id: dto.new_leader_id },
    });

    if (!newLeaderRole) {
      throw new BadRequestException('New leader must be a member of the team');
    }

    await this.prisma.$transaction([
      this.prisma.team.update({
        where: { id: teamId },
        data: { user_id: dto.new_leader_id },
      }),
      this.prisma.teamRole.updateMany({
        where: { team_id: teamId, user_id: userId },
        data: { role: 'MEMBER' },
      }),
      this.prisma.teamRole.updateMany({
        where: { team_id: teamId, user_id: dto.new_leader_id },
        data: { role: 'LEAD' },
      }),
    ]);

    return { message: 'Leadership transferred successfully' };
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.user_id !== userId) {
      throw new ForbiddenException(
        'Only the team leader can update team details',
      );
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Team name cannot be empty');
      }
    }

    const skills =
      dto.skills_suggestions ?? dto.skills_suggestion ?? dto.skills;

    const updatedTeam = await this.prisma.$transaction(async (tx) => {
      if (skills !== undefined) {
        await tx.skillsSuggestion.deleteMany({
          where: { team_id: teamId },
        });

        if (skills.length > 0) {
          await tx.skillsSuggestion.createMany({
            data: skills.map((name) => ({
              team_id: teamId,
              name,
            })),
          });
        }
      }

      return tx.team.update({
        where: { id: teamId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.visibility !== undefined && { visibility: dto.visibility }),
          ...(dto.description !== undefined && {
            description: dto.description.trim(),
          }),
        },
        include: {
          skills_suggestions: true,
          team_codes: true,
          team_roles: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  wallet_address: true,
                },
              },
            },
          },
        },
      });
    });

    return {
      data: updatedTeam,
      message: 'Team updated successfully',
    };
  }
}
