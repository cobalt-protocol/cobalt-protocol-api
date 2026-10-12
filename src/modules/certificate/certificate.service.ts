import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CertificateQueryDto } from './dto/certificate-query.dto.js';

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  constructor(private readonly prisma: PrismaService) {}

  private isValidUlid(v: string): boolean {
    return ULID_REGEX.test(v);
  }

  /**
   * GET api/v1/users/me/certificates/team/:teamId/participant-minted
   * Table: certificate_participant_minted filtered by team_id
   * Enforces team membership: team.user_id = sub OR team_role.user_id = sub
   */
  async findMyParticipantMintedByTeam(
    userId: string,
    teamId: string,
    query: CertificateQueryDto,
  ) {
    if (!teamId || !this.isValidUlid(teamId)) {
      throw new BadRequestException('Invalid team ID format (must be ULID)');
    }
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
      select: { id: true, user_id: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    const isOwner = team.user_id === userId;
    let isMember = isOwner;
    if (!isMember) {
      const role = await this.prisma.teamRole.findFirst({
        where: { team_id: teamId, user_id: userId, deleted_at: null },
        select: { id: true },
      });
      isMember = !!role;
    }
    if (!isMember) throw new ForbiddenException('You are not a member of this team');

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: any = { team_id: teamId, deleted_at: null };

    if (query.competitionId) {
      const compId = query.competitionId.trim();
      if (compId) {
        const competition = await this.prisma.competition.findFirst({
          where: { OR: [{ id: compId }, { competition_id: compId }], deleted_at: null },
          select: { id: true },
        });
        where.competition_id = competition ? competition.id : compId;
      }
    }
    if (query.chainId !== undefined && query.chainId !== null) {
      const chainId = Number(query.chainId);
      if (!Number.isNaN(chainId)) {
        where.OR = [
          { indexer_state: { chain_id: chainId } },
          { competition: { indexer_state: { chain_id: chainId } } },
        ];
      }
    }
    if (query.search) {
      const search = query.search.trim();
      if (search) where.uri = { contains: search, mode: 'insensitive' as const };
    }
    const [total, rows] = await Promise.all([
      this.prisma.certificateParticipantMinted.count({ where }),
      this.prisma.certificateParticipantMinted.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          team: { select: { id: true, name: true, competition_id: true, user_id: true } },
          competition: {
            select: {
              id: true,
              competition_id: true,
              tx_hash: true,
              name: true,
              category: true,
              certificate_cid: true,
              pirze_certificate_claim: true,
            },
          },
          indexer_state: { select: { id: true, chain_id: true, contract_name: true } },
        },
      }),
    ]);
    if (total === 0 || rows.length === 0)
      throw new NotFoundException('No participant certificates found for this team');
    const totalPages = Math.ceil(total / limit);
    return {
      data: rows,
      meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      message: 'Participant certificates retrieved successfully',
      errors: null,
    };
  }

  async findMyParticipantMintedAll(userId: string, query: CertificateQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const ownedTeams = await this.prisma.team.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { id: true },
    });
    const memberRoles = await this.prisma.teamRole.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { team_id: true },
    });
    const teamIdsSet = new Set<string>();
    for (const t of ownedTeams) teamIdsSet.add(t.id);
    for (const r of memberRoles) teamIdsSet.add(r.team_id);
    const teamIds = Array.from(teamIdsSet);
    if (teamIds.length === 0) throw new NotFoundException('No teams found for current user');
    const where: any = { team_id: { in: teamIds }, deleted_at: null };
    if (query.competitionId) {
      const compId = query.competitionId.trim();
      if (compId) {
        const competition = await this.prisma.competition.findFirst({
          where: { OR: [{ id: compId }, { competition_id: compId }], deleted_at: null },
          select: { id: true },
        });
        where.competition_id = competition ? competition.id : compId;
      }
    }
    if (query.chainId !== undefined && query.chainId !== null) {
      const chainId = Number(query.chainId);
      if (!Number.isNaN(chainId))
        where.OR = [
          { indexer_state: { chain_id: chainId } },
          { competition: { indexer_state: { chain_id: chainId } } },
        ];
    }
    if (query.search) {
      const search = query.search.trim();
      if (search) where.uri = { contains: search, mode: 'insensitive' as const };
    }
    const [total, rows] = await Promise.all([
      this.prisma.certificateParticipantMinted.count({ where }),
      this.prisma.certificateParticipantMinted.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          team: { select: { id: true, name: true, competition_id: true, user_id: true } },
          competition: {
            select: {
              id: true,
              competition_id: true,
              tx_hash: true,
              name: true,
              category: true,
              certificate_cid: true,
              pirze_certificate_claim: true,
            },
          },
          indexer_state: { select: { id: true, chain_id: true, contract_name: true } },
        },
      }),
    ]);
    if (total === 0 || rows.length === 0) throw new NotFoundException('No participant certificates found');
    const totalPages = Math.ceil(total / limit);
    return {
      data: rows,
      meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      message: 'Participant certificates retrieved successfully',
      errors: null,
    };
  }
}
