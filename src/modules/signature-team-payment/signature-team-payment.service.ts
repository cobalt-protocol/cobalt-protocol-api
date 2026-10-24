import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ulid } from 'ulid';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  hashTeamPayment,
  resolveCompetitionContractAddress,
  signHashWithSigner,
} from '../../common/utils/certificate-signature.util.js';
import { CreateSignatureTeamPaymentDto } from './dto/create-signature-team-payment.dto.js';

@Injectable()
export class SignatureTeamPaymentService {
  private readonly logger = new Logger(SignatureTeamPaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    chainId: number,
    dto: CreateSignatureTeamPaymentDto,
    callerUserId: string,
    competitionIdParam?: string,
  ) {
    if (!callerUserId) {
      throw new UnauthorizedException('A valid session is required');
    }
    if (!Number.isFinite(chainId)) {
      throw new BadRequestException('Invalid chain_id');
    }

    const caller: any = await (this.prisma as any).user.findFirst({
      where: { id: callerUserId, deleted_at: null },
      include: {
        skills: {
          where: { deleted_at: null },
        },
        skill_description: true,
      } as any,
    });
    if (!caller) {
      throw new UnauthorizedException('User not found');
    }

    const hasBasicProfile =
      typeof caller.username === 'string' &&
      caller.username.trim() !== '' &&
      typeof caller.email === 'string' &&
      caller.email.trim() !== '' &&
      typeof caller.location === 'string' &&
      caller.location.trim() !== '' &&
      typeof caller.institution === 'string' &&
      caller.institution.trim() !== '';

    const hasSkills =
      Array.isArray(caller.skills) &&
      caller.skills.some(
        (s: any) =>
          s &&
          s.deleted_at == null &&
          typeof s.skill_name === 'string' &&
          s.skill_name.trim() !== '',
      );

    const hasSkillDescription =
      caller.skill_description &&
      caller.skill_description.deleted_at == null &&
      typeof caller.skill_description.description === 'string' &&
      caller.skill_description.description.trim() !== '';

    if (!hasBasicProfile || !hasSkills || !hasSkillDescription) {
      throw new ForbiddenException('silahkan update profile');
    }

    const compIdInput = String(
      competitionIdParam ?? dto.competition_id ?? dto.competitionId ?? '',
    ).trim();
    if (!compIdInput) {
      throw new BadRequestException('competition_id is required');
    }

    const cid = String(dto.cid ?? '').trim();

    const competition: any = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: compIdInput }, { competition_id: compIdInput }],
        deleted_at: null,
        indexer_state: { chain_id: chainId },
      } as any,
      include: { indexer_state: true } as any,
    });
    if (!competition) {
      throw new NotFoundException(
        `Competition ${compIdInput} not found on chain ${chainId}`,
      );
    }

    if (!cid) {
      return {
        data: {
          signature: null,
          chain_id: chainId,
          competition_id: competition.id,
          competition_onchain_id: competition.competition_id
            ? String(competition.competition_id)
            : null,
          cid: null,
        },
        message: 'User profile verified for team registration',
        errors: null,
      };
    }

    if (!String(competition.competition_id ?? '').trim()) {
      throw new BadRequestException(
        'Competition is not yet indexed on-chain (competition_id is null).',
      );
    }

    let onchainCompetitionId: bigint;
    try {
      onchainCompetitionId = BigInt(String(competition.competition_id).trim());
    } catch {
      throw new BadRequestException(
        `Invalid on-chain competition_id: ${String(competition.competition_id)}`,
      );
    }
    if (onchainCompetitionId <= 0n) {
      throw new BadRequestException('Invalid on-chain competition_id');
    }

    let contractChecksum: `0x${string}`;
    try {
      contractChecksum = resolveCompetitionContractAddress(competition);
    } catch (e: any) {
      throw new BadRequestException(
        e?.message || 'Invalid COMPETITION_CONTRACT',
      );
    }

    const msgHash = hashTeamPayment(
      contractChecksum,
      onchainCompetitionId,
      cid,
    );

    let signature: `0x${string}`;
    try {
      signature = await signHashWithSigner(msgHash);
    } catch (e: any) {
      this.logger.error(
        'Failed to sign paymentCreateTeam hash: ' + (e?.message || e),
      );
      throw new BadRequestException(
        'Failed to generate paymentCreateTeam signature — check PRIVATE_KEY_SIGNER',
      );
    }

    const indexerStateId: string | null =
      competition.indexer_state_id ?? competition.indexer_state?.id ?? null;

    let row: any;
    const delegate = (this.prisma as any).signatureTeamPayment;
    if (delegate && typeof delegate.create === 'function') {
      row = await delegate.create({
        data: {
          signature,
          user_id: caller.id,
          competition_id: competition.id,
          ...(indexerStateId ? { indexer_state_id: indexerStateId } : {}),
        } as any,
      });
    } else {
      const id = ulid();
      const inserted: any[] = await this.prisma.$queryRaw`
        INSERT INTO signature_team_payment (id, signature, user_id, competition_id, indexer_state_id)
        VALUES (${id}, ${signature}, ${caller.id}, ${competition.id}, ${indexerStateId})
        RETURNING id, signature, user_id, competition_id, indexer_state_id, created_at, updated_at, deleted_at
      `;
      row = inserted[0];
    }

    return {
      data: {
        ...row,
        hash: msgHash,
        contract_address: contractChecksum,
        chain_id: chainId,
        competition_id: competition.id,
        competition_onchain_id: onchainCompetitionId.toString(),
        cid,
      },
      message: 'Signature team payment generated successfully',
      errors: null,
    };
  }
}

