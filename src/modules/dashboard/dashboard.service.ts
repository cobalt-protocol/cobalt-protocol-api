import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async getForUser(userId: string) {
    const memberships = await this.prisma.teamRole.findMany({
      where: { user_id: userId, team: { deleted_at: null } },
      select: {
        role: true,
        team: {
          select: {
            id: true,
            name: true,
            visibility: true,
            competition: {
              select: {
                id: true,
                competition_id: true,
                name: true,
                category: true,
                registration_window: true,
                submission_deadline: true,
              },
            },
            _count: { select: { team_roles: true } },
          },
        },
      },
    });

    return {
      memberships: memberships.map(({ team, role }: { team: any; role: string }) => ({
        teamId: team.id,
        teamName: team.name,
        visibility: team.visibility ? 'public' : 'private',
        role: role.toLowerCase(),
        memberCount: team._count.team_roles,
        competition: {
          id: team.competition.id,
          competition_id: team.competition.competition_id,
          title: team.competition.name,
          category: team.competition.category,
          registrationEndsAt: team.competition.registration_window,
          submissionDeadline: team.competition.submission_deadline,
        },
      })),
      pendingRequests: [],
    };
  }
}

