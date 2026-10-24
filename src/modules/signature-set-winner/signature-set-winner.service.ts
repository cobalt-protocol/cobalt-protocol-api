import {
  BadRequestException,
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
  resolveCompetitionContractAddress,
  hashSetWinner,
  signHashWithSigner,
} from '../../common/utils/certificate-signature.util.js';
import { CreateSignatureSetWinnerDto } from './dto/create-signature-set-winner.dto.js';

@Injectable()
export class SignatureSetWinnerService {
  private readonly logger = new Logger(SignatureSetWinnerService.name);
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    chainId: number,
    competitionIdParam: string,
    dto: CreateSignatureSetWinnerDto,
    callerUserId: string,
  ) {
    if (!callerUserId) throw new UnauthorizedException('A valid session is required');
    if (!Number.isFinite(chainId)) throw new BadRequestException('Invalid chain_id');
    if (!competitionIdParam || String(competitionIdParam).trim() === '') {
      throw new BadRequestException('competition_id is required');
    }
    const teamId = String(dto.team_id ?? '').trim();
    if (!teamId) throw new BadRequestException('team_id is required');
    // Per updated requirement: payload winner_id is prize_winner.id (ULID string), not the on-chain uint256.
    // The on-chain uint256 that goes into the signature hash is prize_winner.winner_id from that row.
    const prizeWinnerIdParam = String(dto.winner_id ?? '').trim();
    if (!prizeWinnerIdParam) throw new BadRequestException('winner_id is required');

    const caller: any = await (this.prisma as any).user.findFirst({ where: { id: callerUserId } });
    if (!caller) throw new UnauthorizedException('User not found');

    const competition: any = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionIdParam }, { competition_id: competitionIdParam }],
        deleted_at: null,
        indexer_state: { chain_id: chainId },
      } as any,
      include: { indexer_state: true } as any,
    });
    if (!competition) {
      throw new NotFoundException('Competition ' + competitionIdParam + ' not found on chain ' + chainId);
    }
    if (!String(competition.competition_id ?? '').trim()) {
      throw new BadRequestException('Competition is not yet indexed on-chain (competition_id is null).');
    }
    let onchainCompetitionId: bigint;
    try {
      onchainCompetitionId = BigInt(competition.competition_id);
    } catch {
      throw new BadRequestException('Invalid on-chain competition_id: ' + competition.competition_id);
    }
    if (onchainCompetitionId <= 0n) throw new BadRequestException('Invalid on-chain competition_id');

    // Payload winner_id = prize_winner.id (ULID string). On-chain uint256 is prize_winner.winner_id column.
    const prizeWinner: any = await (this.prisma as any).prizeWinner.findFirst({
      where: { id: prizeWinnerIdParam, competition_id: competition.id, deleted_at: null } as any,
    });
    if (!prizeWinner) {
      throw new NotFoundException(
        'PrizeWinner id ' + prizeWinnerIdParam + ' not found for competition ' + competitionIdParam + ' on chain ' + chainId,
      );
    }
    let winnerId: bigint;
    try {
      const raw = (prizeWinner as any).winner_id;
      winnerId = typeof raw === 'bigint' ? raw : BigInt(String(raw));
    } catch {
      throw new BadRequestException('Invalid prize_winner.winner_id: ' + String((prizeWinner as any)?.winner_id));
    }
    if (winnerId <= 0n) throw new BadRequestException('prize_winner.winner_id must be > 0');

    const team: any = await this.prisma.team.findFirst({
      where: { id: teamId, competition_id: competition.id, deleted_at: null },
      include: { team_roles: true } as any,
    });
    if (!team) throw new NotFoundException('Team ' + teamId + ' not found for competition ' + competitionIdParam + ' on chain ' + chainId);

    const leadUser = await this.resolveTeamLead(team);
    if (!leadUser || !leadUser.wallet_address || !isAddress(leadUser.wallet_address)) {
      throw new BadRequestException('Team lead wallet not found or invalid for team ' + teamId + ' — ensure team_role LEAD exists and lead user has wallet_address');
    }
    const participantChecksum = getAddress(leadUser.wallet_address);

    let contractChecksum: `0x${string}`;
    try {
      contractChecksum = resolveCompetitionContractAddress(competition);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Invalid COMPETITION_CONTRACT');
    }

    const msgHash = hashSetWinner(contractChecksum, winnerId, participantChecksum, onchainCompetitionId, team.id);

    let signature: `0x${string}`;
    try {
      signature = await signHashWithSigner(msgHash);
    } catch (e: any) {
      this.logger.error('Failed to sign setWinner hash: ' + (e?.message || e));
      throw new BadRequestException('Failed to generate setWinner signature — check PRIVATE_KEY_SIGNER');
    }

    const indexerStateId: string | null = (competition as any).indexer_state_id ?? (competition as any).indexer_state?.id ?? null;
    const existing: any = await (this.prisma as any).signatureSetWinner.findFirst({ where: { team_id: team.id, deleted_at: null } as any });
    let row: any;
    if (!existing) {
      row = await (this.prisma as any).signatureSetWinner.create({
        data: {
          signature,
          user_id: leadUser.id,
          competition_id: competition.id,
          team_id: team.id,
          ...(indexerStateId ? { indexer_state_id: indexerStateId } : {}),
        } as any,
      });
    } else {
      // Do not replace an existing signature; return the stored row as-is.
      row = existing;
    }

    return {
      data: {
        ...row,
        winner_id: winnerId.toString(),
        participant: participantChecksum,
        participant_user_id: leadUser.id,
        contract_address: contractChecksum,
        chain_id: chainId,
        team_id: team.id,
        numeric_team_id: team.id,
        competition_onchain_id: onchainCompetitionId.toString(),
        hash: msgHash,
      },
      message: 'Signature set winner generated successfully',
      errors: null,
    };
  }

  private async resolveTeamLead(team: any): Promise<any | null> {
    const roles: any[] = await (this.prisma as any).teamRole.findMany({ where: { team_id: team.id, deleted_at: null } as any });
    let leadRole: any | null = null;
    for (const r of roles) {
      const roleStr = String(r.role ?? '').trim().toLowerCase();
      if (roleStr === 'lead' || roleStr === 'leader') { leadRole = r; break; }
    }
    if (leadRole) {
      const user: any = await (this.prisma as any).user.findFirst({ where: { id: leadRole.user_id } as any });
      if (user) return user;
    }
    if (team.user_id) {
      const owner: any = await (this.prisma as any).user.findFirst({ where: { id: team.user_id } as any });
      if (owner) return owner;
    }
    return null;
  }
}
