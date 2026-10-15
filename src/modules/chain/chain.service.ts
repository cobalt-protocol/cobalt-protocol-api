import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getAddress, isAddress } from 'viem';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  deriveNumericTeamId,
  getCompetitionContractAddress,
  hashParticipantCertificate,
  signHashWithSigner,
} from '../../common/utils/certificate-signature.util.js';
import {
  buildParticipantCertificateMetadata,
  pinJsonToIpfs,
} from '../../common/utils/ipfs.util.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateChainTeamDto } from './dto/update-chain-team.dto.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { JoinTeamByCodeDto } from './dto/join-team-by-code.dto.js';

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);
  constructor(private readonly prisma: PrismaService) { }

  async getCompetitionsByChainId(chainId: number) {
    const competitions = await this.prisma.competition.findMany({
      where: {
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
      include: {
        prize_winners: {
          where: {
            deleted_at: null,
          },
        },
        prize_deposits: {
          where: {
            deleted_at: null,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        indexer_state: true,
        teams: {
          where: {
            deleted_at: null,
            visibility: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!competitions || competitions.length === 0) {
      throw new NotFoundException(
        `No competitions found for chain ID ${chainId}`,
      );
    }

    const competitionIds = competitions.map((c) => c.id);

    const teamStats = await this.prisma.team.findMany({
      where: {
        competition_id: { in: competitionIds },
        deleted_at: null,
      },
      select: {
        id: true,
        competition_id: true,
        _count: {
          select: {
            team_roles: {
              where: {
                deleted_at: null,
              },
            },
          },
        },
      },
    });

    const statsMap = new Map<
      string,
      { total_teams: number; total_participant: number }
    >();

    for (const team of teamStats) {
      const current = statsMap.get(team.competition_id) ?? {
        total_teams: 0,
        total_participant: 0,
      };
      current.total_teams += 1;
      current.total_participant += team._count?.team_roles ?? 0;
      statsMap.set(team.competition_id, current);
    }

    const formattedCompetitions = competitions.map((competition) => {
      const stats = statsMap.get(competition.id) ?? {
        total_teams: 0,
        total_participant: 0,
      };
      return {
        ...competition,
        total_teams: stats.total_teams,
        total_participant: stats.total_participant,
      };
    });

    return {
      data: formattedCompetitions,
      message: 'Competitions retrieved successfully',
      errors: null,
    };
  }

  async getOrganizationCompetitionsByChainId(chainId: number, userId: string) {
    const competitions = await this.prisma.competition.findMany({
      where: {
        deleted_at: null,
        user_id: userId,
        indexer_state: {
          chain_id: chainId,
        },
      },
      include: {
        prize_winners: {
          where: {
            deleted_at: null,
          },
        },
        prize_deposits: {
          where: {
            deleted_at: null,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        indexer_state: true,
        user: {
          select: {
            id: true,
            wallet_address: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!competitions || competitions.length === 0) {
      throw new NotFoundException(
        `No organization competitions found for chain ID ${chainId}`,
      );
    }

    return {
      data: competitions,
      message: 'Organization competitions retrieved successfully',
      errors: null,
    };
  }

  async getOrganizationTeamsByChainIdAndCompetitionId(
    chainId: number,
    competitionId: string,
    userId: string,
  ) {
    // 1. Resolve competition scoped by chain_id (supports both PK id and on-chain competition_id)
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
      include: { indexer_state: true },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found on chain ID ${chainId}`,
      );
    }

    // 2. Owner check — only competition.user_id (pemilik) boleh akses
    if (competition.user_id !== userId) {
      throw new ForbiddenException(
        'Only the competition owner can access team data for this competition',
      );
    }

    // 3. Filter team dari table `team` scoped competition + chain + owner-competititon
    const teams = await this.prisma.team.findMany({
      where: {
        deleted_at: null,
        competition_id: competition.id,
        competition: {
          deleted_at: null,
          user_id: userId,
          indexer_state: {
            chain_id: chainId,
          },
        },
      },
      include: {
        skills_team: {
          where: { deleted_at: null },
        },
        requirements_team: true,
        team_codes: {
          where: { deleted_at: null },
        },
        team_roles: {
          where: { deleted_at: null },
          include: { user: true },
        },
        request_joins: {
          where: { deleted_at: null },
          include: { user: true },
        },
        submission_project: true,
        user: true,
        competition: {
          include: {
            indexer_state: true,
            prize_winners: {
              where: { deleted_at: null },
            },
            prize_deposits: {
              where: { deleted_at: null },
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      data: teams,
      message: 'Organization teams retrieved successfully',
      errors: null,
    };
  }

  async getCompetitionByChainIdAndId(chainId: number, id: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
      include: {
        prize_winners: {
          where: {
            deleted_at: null,
          },
        },
        prize_deposits: {
          where: {
            deleted_at: null,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        indexer_state: true,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${id} not found on chain ID ${chainId}`,
      );
    }

    return {
      data: competition,
      message: 'Competition retrieved successfully',
      errors: null,
    };
  }

  async getPrizeWinnersByChainIdAndCompetitionId(
    chainId: number,
    competitionId: string,
  ) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
      select: {
        id: true,
        competition_id: true,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found on chain ID ${chainId}`,
      );
    }

    const prizeWinners = await this.prisma.prizeWinner.findMany({
      where: {
        competition_id: competition.id,
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
      orderBy: {
        winner_id: 'asc',
      },
    });

    return {
      data: prizeWinners,
      message: 'Prize winners retrieved successfully',
      errors: null,
    };
  }

  async createTeam(
    userId: string,
    chainId: number,
    competitionId: string,
    dto: import('../../competition/dto/create-team.dto.js').CreateCompetitionTeamDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found on chain ID ${chainId}`,
      );
    }

    const isPrivate = !dto.visibility;
    const { randomBytes } = await import('crypto');
    const teamCodeStr = isPrivate
      ? `COBALT-${randomBytes(5).toString('hex').toUpperCase()}`
      : null;

    const teamName =
      dto.name && dto.name.trim()
        ? dto.name.trim()
        : `Team ${randomBytes(3).toString('hex').toUpperCase()}`;

    // Create team and assign creator as LEAD in a single transaction implicitly 
    // by using nested creates in Prisma
    const team = await this.prisma.team.create({
      data: {
        name: teamName,
        visibility: Boolean(dto.visibility),
        description: dto.description ? dto.description.trim() : '',
        competition_id: competition.id,
        user_id: user.id,
        skills_team: {
          create:
            dto.skills_team
              ?.map((s) => (typeof s === 'string' ? s.trim() : ''))
              .filter((name) => name.length > 0)
              .map((name) => ({ name })) ?? [],
        },
        requirements_team: {
          create: {
            requirement: dto.description ? dto.description.trim() : '',
          },
        },
        ...(isPrivate && teamCodeStr
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
              role: 'LEAD',
            },
          ],
        },
      },
      include: {
        skills_team: true,
        requirements_team: true,
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
        skills_team: team.skills_team,
        requirements_team: team.requirements_team,
        team_roles: team.team_roles,
        created_at: team.created_at,
        updated_at: team.updated_at,
      },
      message: 'Team created successfully',
      errors: null,
    };
  }
  /**
   * GET api/v1/chains/:chain_id/teams
   * Source: team_role (accepted) UNION request_join (pending)
   * - team_role.user_id = JWT sub -> team -> competition -> indexer_state.chain_id => status='accepted'
   * - request_join.user_id = JWT sub -> team -> competition -> indexer_state.chain_id => status=row.status (pending)
   * Soft-delete aware: deleted_at IS NULL on team_role/request_join, team, competition
   * Dedup: jika user sudah accepted di team yang sama, baris request_join untuk team itu diabaikan
   */
  async getUserTeamsByChainId(userId: string, chainId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const teamRoles = await this.prisma.teamRole.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        team: {
          deleted_at: null,
          competition: {
            deleted_at: null,
            indexer_state: {
              chain_id: chainId,
            },
          },
        },
      },
      include: {
        team: {
          include: {
            competition: {
              include: {
                prize_winners: {
                  where: {
                    deleted_at: null,
                  },
                  include: {
                    winner: true,
                  },
                },
                prize_deposits: {
                  where: {
                    deleted_at: null,
                  },
                  orderBy: {
                    created_at: 'desc',
                  },
                },
                indexer_state: true,
              },
            },
            skills_team: {
              where: { deleted_at: null },
            },
            requirements_team: true,
            team_codes: {
              where: { deleted_at: null },
            },
            team_roles: {
              where: { deleted_at: null },
              include: { user: true },
            },
            request_joins: {
              where: { deleted_at: null },
            },
            submission_project: true,
          },
        },
        user: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const requestJoins = await this.prisma.requestJoin.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        team: {
          deleted_at: null,
          competition: {
            deleted_at: null,
            indexer_state: {
              chain_id: chainId,
            },
          },
        },
      },
      include: {
        team: {
          include: {
            competition: {
              include: {
                prize_winners: {
                  where: {
                    deleted_at: null,
                  },
                  include: {
                    winner: true,
                  },
                },
                prize_deposits: {
                  where: {
                    deleted_at: null,
                  },
                  orderBy: {
                    created_at: 'desc',
                  },
                },
                indexer_state: true,
              },
            },
            skills_team: {
              where: { deleted_at: null },
            },
            requirements_team: true,
            team_codes: {
              where: { deleted_at: null },
            },
            team_roles: {
              where: { deleted_at: null },
              include: { user: true },
            },
            request_joins: {
              where: { deleted_at: null },
            },
            submission_project: true,
          },
        },
        user: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const enrichCompetition = (item: any) => {
      const competition = item.team?.competition;
      if (!competition) return;
      const prizeWinners = competition?.prize_winners || [];
      const total = prizeWinners.reduce(
        (sum: number, pw: any) => sum + Number(pw.amount || 0),
        0,
      );
      const prizeDeposits = competition?.prize_deposits || [];
      const firstDeposit = prizeDeposits[0] as any | undefined;
      const token =
        (firstDeposit?.token_address && String(firstDeposit.token_address).trim()
          ? String(firstDeposit.token_address)
          : null) ||
        prizeDeposits.find((deposit: any) => Boolean(deposit.token_address))
          ?.token_address ||
        competition?.fee_token_address ||
        null;
      competition.total = total;
      competition.token = token;
      competition.prize_deposits = prizeDeposits.map((d: any) => ({
        ...d,
        treasury_prize_id:
          d.treasury_prize_id !== undefined && d.treasury_prize_id !== null
            ? String(d.treasury_prize_id)
            : d.treasury_prize_id,
        amount:
          d.amount !== undefined && d.amount !== null ? String(d.amount) : d.amount,
      }));
    };

    const accepted = teamRoles.map((role: any) => {
      enrichCompetition(role);
      return { ...role, status: 'accepted' as const, source: 'team_role' as const };
    });

    const acceptedTeamIds = new Set(
      accepted.map((a: any) => a.team_id ?? a.team?.id),
    );

    const pending = requestJoins
      .filter((rj: any) => !acceptedTeamIds.has(rj.team_id ?? rj.team?.id))
      .map((rj: any) => {
        enrichCompetition(rj);
        return {
          ...rj,
          status: (rj.status as string) || 'pending',
          source: 'request_join' as const,
        };
      });

    const merged = [...accepted, ...pending].sort((a: any, b: any) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });

    return {
      data: merged,
      message: 'User teams retrieved successfully',
      errors: null,
    };
  }


  /**
   * GET api/v1/chains/:chain_id/competitions/:competition_id/join-teams
   * Public teams listing - khusus get data team yang visibility public
   * Filter:
   *  - team.visibility = true (public)
   *  - team.deleted_at IS NULL
   *  - competition.deleted_at IS NULL dan indexer_state.chain_id = :chain_id
   *  - competition.id atau competition.competition_id = :competition_id
   *  - SKIP jika authenticated user sudah ada di request_join (user_id) atau team_role (user_id) untuk team tersebut
   * Protected: Wajib Authorization: Bearer <JWT> (AuthSessionGuard -> req.userId)
   * Dipakai oleh web: apps/web/features/teams/components/join-team-page.tsx via fetchTeamsByCompetitionId()
   * Alias lama: GET .../teams/public tetap didukung untuk backward compat.
   */
  async getPublicTeamsByChainIdAndCompetitionId(
    userId: string,
    chainId: number,
    competitionId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
      include: {
        indexer_state: true,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found on chain ID ${chainId}`,
      );
    }

    const teams = await this.prisma.team.findMany({
      where: {
        visibility: true,
        deleted_at: null,
        competition_id: competition.id,
        // Skip jika user sudah ada di request_join ATAU team_role
        // Prisma `none` = tidak ada baris yang cocok -> skip yang sudah join/request
        request_joins: {
          none: {
            user_id: userId,
            deleted_at: null,
          },
        },
        team_roles: {
          none: {
            user_id: userId,
            deleted_at: null,
          },
        },
        // Pastikan competition masih ter-filter chain_id (redundant tapi aman jika competition_id di-resolve)
        competition: {
          deleted_at: null,
          indexer_state: {
            chain_id: chainId,
          },
        },
      },
      include: {
        skills_team: {
          where: { deleted_at: null },
        },
        requirements_team: true,
        team_codes: {
          where: { deleted_at: null },
        },
        team_roles: {
          where: { deleted_at: null },
          include: { user: true },
        },
        request_joins: {
          where: { deleted_at: null },
          include: { user: true },
        },
        submission_project: true,
        user: true,
        competition: {
          include: {
            indexer_state: true,
            prize_winners: {
              where: { deleted_at: null },
            },
            prize_deposits: {
              where: { deleted_at: null },
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      data: teams,
      message: 'Public teams retrieved successfully',
      errors: null,
    };
  }

  /**
   * POST api/v1/chains/:chain_id/teams/:team_id/request-join
   * Spec diminta: api/v1/chains/<chain_id>/teams/<competition_id>/request-join
   *   - param terakhir secara posisi adalah team PK (Team.id). Dinamai :team_id di code,
   *     tapi path literal tetap /teams/<id>/request-join sehingga kompatibel dengan spec
   *     yang menyebut <competition_id> di posisi itu.
   * Protected: Wajib Authorization: Bearer <JWT> (AuthSessionGuard -> req.userId)
   * Validasi: user exists, team exists (deleted_at IS NULL) + competition.indexer_state.chain_id = :chain_id
   * Guard: 409 jika user sudah jadi member (team_role) atau sudah request (request_join pending) di team itu
   * Effect: insert ke table `request_join` (@@map "request_join") dengan status='pending'
   */
  async requestJoinTeam(userId: string, chainId: number, teamId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        deleted_at: null,
        competition: {
          deleted_at: null,
          indexer_state: {
            chain_id: chainId,
          },
        },
      },
      include: {
        competition: {
          include: { indexer_state: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(
        `Team with ID ${teamId} not found on chain ID ${chainId}`,
      );
    }

    const existingRole = await this.prisma.teamRole.findFirst({
      where: {
        user_id: userId,
        team_id: teamId,
        deleted_at: null,
      },
    });
    if (existingRole) {
      throw new ConflictException('Already a member of this team');
    }

    const existingRequest = await this.prisma.requestJoin.findFirst({
      where: {
        user_id: userId,
        team_id: teamId,
        deleted_at: null,
      },
    });
    if (existingRequest) {
      // Jika masih pending -> 409, jika status lain (rejected dll) bisa izinkan re-request dengan re-activate?
      // Untuk sekarang 409 untuk semua active request agar idempotent.
      throw new ConflictException('Already requested to join this team');
    }

    const requestJoin = await this.prisma.requestJoin.create({
      data: {
        user_id: userId,
        team_id: teamId,
        status: 'pending',
      },
    });

    return {
      data: requestJoin,
      message: 'Request to join team created successfully',
      errors: null,
    };
  }

  /**
   * Resolve the max member capacity from `competition.formation`.
   * Supported formats: "1-3" / "1–5" (en dash) / "1 to 5" / "3" / "solo".
   * Falls back to 5 when the formation is missing or cannot be parsed.
   */
  private parseCapacityFromFormation(formation?: string | null): number {
    const fallback = 5;
    if (!formation) {
      return fallback;
    }

    const trimmed = formation.trim();
    if (/solo/i.test(trimmed)) {
      return 1;
    }

    // Range such as "1-3" or "1 – 5" -> use the upper bound.
    const rangeMatch = trimmed.match(/(\d+)\s*(?:–|—|-|to)\s*(\d+)/i);
    if (rangeMatch && rangeMatch[2]) {
      const upper = parseInt(rangeMatch[2], 10);
      if (!Number.isNaN(upper) && upper > 0) {
        return upper;
      }
    }

    // Single value such as "3" or "3 members".
    const singleMatch = trimmed.match(/(\d+)/);
    if (singleMatch && singleMatch[1]) {
      const value = parseInt(singleMatch[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        return value;
      }
    }

    return fallback;
  }

  /**
   * POST api/v1/chains/:chain_id/competitions/:competition_id/join-by-code
   * Join a team instantly using a team code stored in the `team_code` table.
   * Protected: Authentication header (Bearer JWT) -> AuthSessionGuard sets req.userId.
   * Steps:
   *  - Resolve competition by id/competition_id, deleted_at IS NULL and indexer_state.chain_id = :chain_id.
   *  - Lookup `team_code` by code (case-insensitive, deleted_at IS NULL) and resolve its `team`.
   *  - Validate the resolved team belongs to the given competition.
   *  - Compute capacity from `competition.formation` (e.g. "1-3" => 3, "1-5" => 5).
   *  - Guard 409 when the user is already a member or the team is already full.
   * Effect: INSERT INTO team_role (user_id, team_id, role='MEMBER').
   */
  async joinTeamByCode(
    userId: string,
    chainId: number,
    competitionId: string,
    dto: JoinTeamByCodeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
        deleted_at: null,
        indexer_state: {
          chain_id: chainId,
        },
      },
    });
    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found on chain ID ${chainId}`,
      );
    }

    const teamCode = await this.prisma.teamCode.findFirst({
      where: {
        code: { equals: dto.team_code.trim(), mode: 'insensitive' },
        deleted_at: null,
        team_id: { not: null },
      },
      include: {
        team: true,
      },
    });

    if (!teamCode || !teamCode.team || teamCode.team.deleted_at) {
      throw new NotFoundException('Invalid team code');
    }

    const team = teamCode.team;
    if (team.competition_id !== competition.id) {
      throw new BadRequestException(
        'Team code does not belong to this competition',
      );
    }

    const maxTeamSize = this.parseCapacityFromFormation(competition.formation);

    const [memberCount, existingRole] = await Promise.all([
      this.prisma.teamRole.count({
        where: { team_id: team.id, deleted_at: null },
      }),
      this.prisma.teamRole.findFirst({
        where: { team_id: team.id, user_id: userId, deleted_at: null },
      }),
    ]);

    if (existingRole) {
      throw new ConflictException('Already a member of this team');
    }

    if (memberCount >= maxTeamSize) {
      throw new ConflictException('Team is full');
    }

    const role = await this.prisma.teamRole.create({
      data: {
        team_id: team.id,
        user_id: userId,
        role: 'MEMBER',
      },
    });

    return {
      data: {
        team_id: team.id,
        team_name: team.name,
        role,
        max_team_size: maxTeamSize,
        member_count: memberCount + 1,
      },
      message: 'Joined team successfully',
      errors: null,
    };
  }

  /**
   * GET api/v1/chains/:chain_id/teams/:team_id/requests
   * Spec diminta: get data dari table `request_join` filter by team_id,
   * plus filter owner: team.user_id harus == userId dari JWT (AuthSessionGuard).
   * Validasi chain: team.competition.indexer_state.chain_id === :chain_id.
   * Response: { data: RequestJoin[] (+user include skill_description/social_media/skills), message, errors }
   * Errors: 404 team not on chain, 403 non-owner, 401 handled by guard.
   */
  async getTeamJoinRequests(userId: string, chainId: number, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        deleted_at: null,
        competition: {
          deleted_at: null,
          indexer_state: { chain_id: chainId },
        },
      },
      select: {
        id: true,
        user_id: true,
        competition_id: true,
        competition: { select: { id: true, indexer_state: { select: { chain_id: true } } } },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    }

    if (team.user_id !== userId) {
      throw new ForbiddenException('Only the team leader can view join requests');
    }

    const requests = await this.prisma.requestJoin.findMany({
      where: { team_id: team.id, deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            wallet_address: true,
            institution: true,
            location: true,
            skill_description: true,
            social_media: true,
            skills: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return { data: requests, message: 'Join requests retrieved successfully', errors: null };
  }

  /**
   * PATCH api/v1/chains/:chain_id/teams/:team_id/requests/:request_id/accept
   * Leader only (team.user_id === userId). Validasi chain + deleted_at.
   * Guard: 404 jika team/request tidak ada, 400 jika status !== pending, 400/409 jika sudah member.
   * Effect: $transaction -> requestJoin.status='accepted' + teamRole.create MEMBER.
   * Disinkronkan dengan FE: acceptTeamJoinRequest() -> PATCH .../requests/:requestId/accept
   */
  async acceptTeamJoinRequest(userId: string, chainId: number, teamId: string, requestId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null, competition: { deleted_at: null, indexer_state: { chain_id: chainId } } },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    if (team.user_id !== userId) throw new ForbiddenException('Only the team leader can accept join requests');

    const request = await this.prisma.requestJoin.findFirst({
      where: { id: requestId, team_id: team.id, deleted_at: null },
    });
    if (!request) throw new NotFoundException('Join request not found');
    if (request.status !== 'pending') throw new BadRequestException('Join request has already been processed');

    const existingRole = await this.prisma.teamRole.findFirst({
      where: { team_id: team.id, user_id: request.user_id, deleted_at: null },
    });
    if (existingRole) throw new BadRequestException('User is already a member of this team');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.requestJoin.update({ where: { id: request.id }, data: { status: 'accepted' } });
      const role = await tx.teamRole.create({ data: { team_id: team.id, user_id: request.user_id, role: 'MEMBER' } });
      return { request: updatedRequest, role };
    });

    return { data: result, message: 'Join request accepted successfully', errors: null };
  }

  /**
   * PATCH api/v1/chains/:chain_id/teams/:team_id/requests/:request_id/reject
   * Leader only. Validasi chain + team ownership. Update requestJoin.status='rejected'.
   */
  async rejectTeamJoinRequest(userId: string, chainId: number, teamId: string, requestId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null, competition: { deleted_at: null, indexer_state: { chain_id: chainId } } },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    if (team.user_id !== userId) throw new ForbiddenException('Only the team leader can reject join requests');

    const request = await this.prisma.requestJoin.findFirst({
      where: { id: requestId, team_id: team.id, deleted_at: null },
    });
    if (!request) throw new NotFoundException('Join request not found');
    if (request.status !== 'pending') throw new BadRequestException('Join request has already been processed');

    const updatedRequest = await this.prisma.requestJoin.update({ where: { id: request.id }, data: { status: 'rejected' } });
    return { data: updatedRequest, message: 'Join request rejected successfully', errors: null };
  }

  async getTeamDetail(chainId: number, teamId: string, userId?: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        deleted_at: null,
        competition: { deleted_at: null, indexer_state: { chain_id: chainId } },
      },
      include: {
        competition: {
          include: {
            indexer_state: true,
            user: { select: { id: true, wallet_address: true } },
            prize_winners: { where: { deleted_at: null }, include: { winner: true } },
            prize_deposits: { where: { deleted_at: null }, orderBy: { created_at: 'desc' } },
          },
        },
        user: { select: { id: true, username: true, wallet_address: true } },
        team_roles: {
          where: { deleted_at: null },
          include: { user: { select: { id: true, username: true, wallet_address: true, email: true, institution: true, location: true } } },
        },
        team_codes: { where: { deleted_at: null } },
        skills_team: { where: { deleted_at: null } },
        requirements_team: true,
        submission_project: true,
        request_joins: { where: { deleted_at: null } },
      },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    const isMember = Boolean(userId && (team.user_id === userId || team.team_roles.some((r: any) => r.user_id === userId)));

    // Owner kompetisi boleh akses detail team apa pun (private sekalipun) dengan status 200 — jangan 403.
    // Cek competition.user_id (atau competition.user.id) == userId. Juga handle case-insensitive + wallet + feePaid seperti getTeamMembers.
    let isCompetitionOwner = false;
    if (userId) {
      const comp: any = (team as any).competition;
      const compUserId: string | null = comp?.user_id ?? comp?.user?.id ?? null;
      if (compUserId && String(compUserId).toLowerCase() === String(userId).toLowerCase()) {
        isCompetitionOwner = true;
      }
      if (!isCompetitionOwner) {
        try {
          const user: any = await (this.prisma as any).user?.findFirst?.({
            where: { OR: [{ id: userId }, { wallet_address: { equals: userId, mode: 'insensitive' } }] },
          });
          if (user) {
            const dbUserIdLower = String(user.id).toLowerCase();
            const dbWalletLower = String(user.wallet_address ?? '').toLowerCase();
            if (compUserId) {
              const cLower = String(compUserId).toLowerCase();
              if (cLower === dbUserIdLower || (dbWalletLower && cLower === dbWalletLower)) isCompetitionOwner = true;
            }
            if (!isCompetitionOwner && comp?.id) {
              const feePaid = await (this.prisma as any).competitionFeePaid?.findFirst?.({
                where: { competition_id: comp.id, payer: { equals: user.wallet_address, mode: 'insensitive' } },
              });
              if (feePaid) isCompetitionOwner = true;
            }
          }
        } catch {}
      }
    }

    if (!team.visibility && !isMember && !isCompetitionOwner) throw new ForbiddenException('Private team access is restricted');
    return { data: team, message: 'Team retrieved successfully', errors: null };
  }

  async updateTeam(chainId: number, teamId: string, userId: string, dto: UpdateChainTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null, competition: { deleted_at: null, indexer_state: { chain_id: chainId } } },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    if (team.user_id !== userId) throw new ForbiddenException('Only the team leader can update team details');
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Team name cannot be empty');
    const updatedTeam = await this.prisma.$transaction(async (tx) => {
      if (dto.skills_team !== undefined) {
        await tx.skillsTeam.deleteMany({ where: { team_id: teamId } });
        const skills = dto.skills_team.map((s) => (typeof s === 'string' ? s.trim() : '')).filter((n) => n.length > 0);
        if (skills.length > 0) await tx.skillsTeam.createMany({ data: skills.map((name) => ({ team_id: teamId, name })) });
      }
      if (dto.description !== undefined) {
        const requirement = dto.description.trim();
        await tx.requirementsTeam.upsert({ where: { team_id: teamId }, create: { team_id: teamId, requirement }, update: { requirement } });
      }
      return tx.team.update({
        where: { id: teamId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.visibility !== undefined && { visibility: dto.visibility }),
          ...(dto.description !== undefined && { description: dto.description.trim() }),
        },
        include: {
          skills_team: true,
          requirements_team: true,
          team_codes: true,
          team_roles: { include: { user: { select: { id: true, username: true, email: true, wallet_address: true } } } },
        },
      });
    });
    return { data: updatedTeam, message: 'Team updated successfully', errors: null };
  }

  async getTeamMembers(chainId: number, teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null, competition: { deleted_at: null, indexer_state: { chain_id: chainId } } },
      include: {
        competition: { include: { user: { select: { id: true } } } },
        team_roles: { where: { deleted_at: null }, include: { user: { select: { id: true, username: true, wallet_address: true, email: true } } } },
      },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    let isCompetitionOwner = false;
    const compUserId = (team as any).competition?.user?.id ?? null;
    if (compUserId && compUserId.toLowerCase() === userId.toLowerCase()) isCompetitionOwner = true;
    if (!isCompetitionOwner) {
      const user = await (this.prisma as any).user?.findFirst?.({ where: { OR: [{ id: userId }, { wallet_address: { equals: userId, mode: 'insensitive' } }] } });
      if (user) {
        const dbUserIdLower = user.id.toLowerCase();
        const dbWalletLower = user.wallet_address.toLowerCase();
        if (compUserId) {
          const cLower = compUserId.toLowerCase();
          if (cLower === dbUserIdLower || cLower === dbWalletLower) isCompetitionOwner = true;
        }
        if (!isCompetitionOwner && (team as any).competition?.id) {
          const feePaid = await (this.prisma as any).competitionFeePaid?.findFirst?.({ where: { competition_id: (team as any).competition.id, payer: { equals: user.wallet_address, mode: 'insensitive' } } });
          if (feePaid) isCompetitionOwner = true;
        }
      }
    }
    if (!isCompetitionOwner) {
      if (userId) {
        const pending = await this.prisma.requestJoin.findFirst({ where: { team_id: team.id, user_id: userId, status: 'pending', deleted_at: null } });
        if (pending) throw new ForbiddenException('Your join request is still pending');
      }
      const isMember = userId && (team.user_id === userId || (team as any).team_roles?.some((r: any) => r.user_id === userId));
      if (!isMember) throw new NotFoundException('Team not found');
    }
    return { data: (team as any).team_roles, message: 'Team members retrieved successfully', errors: null };
  }

  async getTeamSubmission(chainId: number, teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null, competition: { deleted_at: null, indexer_state: { chain_id: chainId } } },
      include: { team_roles: { where: { deleted_at: null } } },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    const isMember = userId && (team.user_id === userId || team.team_roles.some((r: any) => r.user_id === userId));
    if (!isMember) {
      const comp = await this.prisma.competition.findFirst({ where: { id: team.competition_id, deleted_at: null }, include: { user: { select: { id: true } } } });
      if (!comp || comp.user?.id !== userId) throw new ForbiddenException('Only team members can view submission');
    }
    const submission = await (this.prisma as any).submissionProject?.findFirst?.({ where: { team_id: team.id, deleted_at: null } }) ?? null;
    return { data: submission, message: submission ? 'Submission retrieved' : 'No submission yet', errors: null };
  }

  async createTeamSubmission(chainId: number, teamId: string, userId: string, dto: CreateSubmissionDto) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null, competition: { deleted_at: null, indexer_state: { chain_id: chainId } } },
      include: { team_roles: { where: { deleted_at: null } } },
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamId} not found on chain ID ${chainId}`);
    const isMember = team.user_id === userId || team.team_roles.some((r: any) => r.user_id === userId);
    if (!isMember) throw new ForbiddenException('Only team members can submit');
    const existing = await (this.prisma as any).submissionProject?.findFirst?.({ where: { team_id: team.id } });
    const data = { title: dto.title, description: dto.description ?? null, submission_link: dto.submission_link, document_cid: dto.document_cid, team_id: team.id };
    const submission = existing
      ? await (this.prisma as any).submissionProject.update({ where: { id: existing.id }, data })
      : await (this.prisma as any).submissionProject.create({ data });
    return { data: submission, message: existing ? 'Submission updated successfully' : 'Submission created successfully', errors: null };
  }

  async updateProfile(userId: string, chainId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // update user basic details
      const updateData: any = {};
      if (dto.username !== undefined) updateData.username = dto.username;
      if (dto.email !== undefined) updateData.email = dto.email;
      if (dto.location !== undefined) updateData.location = dto.location;
      if (dto.institution !== undefined) updateData.institution = dto.institution;

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: updateData,
        });
      }

      // update skill description (pitch)
      const pitch = dto.pitch ?? dto.description;
      if (pitch !== undefined) {
        await tx.skillDescriptionUser.upsert({
          where: { user_id: userId },
          create: { user_id: userId, description: pitch },
          update: { description: pitch },
        });
      }

      // update social media
      const github =
        dto.github_link ?? dto.githubLink ?? dto.social_media?.github_link;
      const linkedin =
        dto.linkedin_link ??
        dto.linkedinLink ??
        dto.social_media?.linkedin_link;

      if (github !== undefined || linkedin !== undefined) {
        const socialData: any = {};
        if (github !== undefined) socialData.github_link = github;
        if (linkedin !== undefined) socialData.linkedin_link = linkedin;

        const existingSocial = await tx.socialMediaUser.findUnique({
          where: { user_id: userId },
        });

        if (existingSocial) {
          await tx.socialMediaUser.update({
            where: { user_id: userId },
            data: socialData,
          });
        } else {
          await tx.socialMediaUser.create({
            data: {
              user_id: userId,
              github_link: socialData.github_link ?? '',
              linkedin_link: socialData.linkedin_link ?? '',
            },
          });
        }
      }

      // update skills
      if (dto.skills && Array.isArray(dto.skills)) {
        await tx.skillUser.deleteMany({
          where: { user_id: userId },
        });

        const validSkills = dto.skills.filter(
          (s) => s.name && s.name.trim() !== '',
        );

        if (validSkills.length > 0) {
          const uniqueSkillNames = Array.from(
            new Set(validSkills.map((s) => s.name!.trim())),
          );

          await tx.skillUser.createMany({
            data: uniqueSkillNames.map((name) => ({
              user_id: userId,
              skill_name: name,
            })),
          });
        }
      }
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skill_description: true,
        social_media: true,
        skills: true,
        organizations: true,
      },
    });

    let role = 'user';
    let organization = null;
    if (updatedUser?.organizations && updatedUser.organizations.length > 0) {
      role = 'organization';
      organization = updatedUser.organizations[0];
    }
    const { organizations: _organizations, ...userWithoutOrganizations } = updatedUser!;

    return {
      data: {
        user: {
          ...userWithoutOrganizations,
          role,
          skill_description: updatedUser!.skill_description ?? null,
          social_media: updatedUser!.social_media ?? null,
          skills: updatedUser!.skills ?? [],
          organization,
        },
      },
      message: 'Profile updated successfully',
      errors: null,
    };
  }
  /**
   * Generate & persist participant certificate signature (chain-scoped).
   * POST api/v1/chains/:chain_id/competitions/:competition_id/signature-certificate-participant/:team_id
   * Hash 1:1 dengan cobalt-protocol-smart-contract/scripts/competitions/claim_certificate_participant.py:
   *   HARDCODED_CID raw (tanpa ipfs://) -> keccak256(abi.encodePacked(address(this), msg.sender, _competitionId, _teamId, _cid))
   *   On-chain: IPFSHelper.toIPFSURI(_cid) => ipfs://<cid>, certId = CertificateHelper.certId(..., _cid)
   * Ref: CompetitionManager.sol safeMintCertificateParticipant(uint256 _competitionId, uint256 _teamId, bytes _signature, string _cid)
   */
  async generateSignatureCertificateParticipant(
    chainId: number,
    competitionIdParam: string,
    teamId: string,
    callerUserId: string,
  ) {
    if (!teamId || String(teamId).trim() === '') {
      throw new BadRequestException('teamId is required');
    }
    if (!callerUserId) throw new UnauthorizedException('A valid session is required');
    const user: any = await this.prisma.user.findFirst({ where: { id: callerUserId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.wallet_address || !isAddress(user.wallet_address)) {
      throw new BadRequestException('Authenticated user has no valid wallet address');
    }
    const competition: any = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionIdParam }, { competition_id: competitionIdParam }],
        deleted_at: null,
        indexer_state: { chain_id: chainId },
      } as any,
      include: { indexer_state: true } as any,
    });
    if (!competition) {
      throw new NotFoundException(`Competition ${competitionIdParam} not found on chain ${chainId}`);
    }
    if (!String(competition.competition_id ?? '').trim()) {
      throw new BadRequestException('Competition is not yet indexed on-chain (competition_id is null).');
    }
    let onchainCompId: bigint;
    try { onchainCompId = BigInt(competition.competition_id); } catch {
      throw new BadRequestException(`Invalid on-chain competition_id: ${competition.competition_id}`);
    }
    if (onchainCompId <= 0n) throw new BadRequestException(`Invalid on-chain competition_id: ${competition.competition_id}`);
    const team: any = await (async () => {
      const found = await this.prisma.team.findFirst({
        where: { id: teamId, competition_id: competition.id, deleted_at: null },
        include: { team_roles: true } as any,
      });
      if (!found) throw new NotFoundException(`Team ${teamId} not found for competition ${competitionIdParam} on chain ${chainId}`);
      const isMember = found.user_id === user.id || (Array.isArray((found as any).team_roles) && (found as any).team_roles.some((r: any) => r.user_id === user.id));
      if (!isMember) {
        const m = await this.prisma.team.findFirst({
          where: { id: teamId, competition_id: competition.id, deleted_at: null, OR: [{ user_id: user.id }, { team_roles: { some: { user_id: user.id } } }] } as any,
        });
        if (!m) throw new ForbiddenException('You are not a member of the specified team');
        return m;
      }
      return found;
    })();
    const submission: any = (await (this.prisma as any).submissionProject?.findFirst?.({ where: { team_id: team.id, deleted_at: null } })) ?? null;
    if (!submission) throw new BadRequestException('Team has not submitted any project yet (submission_project is empty)');
    const metadata = buildParticipantCertificateMetadata({
      submission,
      competition,
      team,
    });

    let metadataCidRaw: string;
    try {
      metadataCidRaw = await pinJsonToIpfs(metadata);
    } catch (e: any) {
      this.logger.error(
        `Failed to pin participant certificate metadata to IPFS: ${e?.message || e}`,
      );
      throw new BadRequestException(
        e?.message || 'Failed to pin certificate metadata to IPFS',
      );
    }
    let contractChecksum: `0x${string}`;
    try { contractChecksum = getCompetitionContractAddress(); } catch (e: any) {
      throw new BadRequestException(e?.message || 'Invalid COMPETITION_CONTRACT');
    }
    const participantChecksum = getAddress(user.wallet_address);
    const numericTeamId = deriveNumericTeamId(team.id);
    const msgHash = hashParticipantCertificate(contractChecksum, participantChecksum, onchainCompId, numericTeamId, metadataCidRaw);
    let signature: `0x${string}`;
    try { signature = await signHashWithSigner(msgHash); } catch (e: any) {
      this.logger.error(`Failed to sign participant certificate hash: ${e}`);
      throw new BadRequestException('Failed to generate participant certificate signature');
    }
    const existingSig: any = (await (this.prisma as any).signatureCertificateParticipant?.findFirst?.({ where: { user_id: user.id, competition_id: competition.id, team_id: team.id, deleted_at: null } })) ?? null;
    let row: any;
    const indexerStateId: string | null = (competition as any).indexer_state_id ?? (competition as any).indexer_state?.id ?? null;
    if (!existingSig) {
      row = await (this.prisma as any).signatureCertificateParticipant.create({
        data: { signature, user_id: user.id, competition_id: competition.id, team_id: team.id, ...(indexerStateId ? { indexer_state_id: indexerStateId } : {}) },
      });
    } else if (existingSig.signature !== signature || existingSig.team_id !== team.id) {
      row = await (this.prisma as any).signatureCertificateParticipant.update({ where: { id: existingSig.id }, data: { signature, team_id: team.id } });
    } else { row = existingSig; }
    const uri = metadataCidRaw ? `ipfs://${metadataCidRaw}` : '';
    return { data: { ...row, cid: metadataCidRaw, uri, metadata, certificate_cid: metadataCidRaw }, message: 'Signature certificate participant generated successfully', errors: null };
  }


}
