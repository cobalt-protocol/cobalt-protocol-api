import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ulid } from 'ulid';
import { getAddress, isAddress } from 'viem';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  type CreateCompetitionPaymentStruct,
  type CreateCompetitionStruct,
  type CreateCompetitionWinnerStruct,
  getCompetitionContractAddress,
  hashCreateCompetition,
  resolveCompetitionContractAddress,
  signHashWithSigner,
} from '../../common/utils/certificate-signature.util.js';
import { CreateSignatureCreateCompetitionDto } from './dto/create-signature-create-competition.dto.js';

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;

@Injectable()
export class SignatureCreateCompetitionService {
  private readonly logger = new Logger(SignatureCreateCompetitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    dto: CreateSignatureCreateCompetitionDto,
    callerUserId: string,
    chainIdParam?: number,
  ) {
    if (!callerUserId) {
      throw new UnauthorizedException('A valid session is required');
    }

    const caller: any = await (this.prisma as any).user.findFirst({
      where: { id: callerUserId, deleted_at: null },
      include: {
        organizations: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
        },
      } as any,
    });
    if (!caller) {
      throw new UnauthorizedException('User not found');
    }

    const organizations: any[] = Array.isArray(caller.organizations)
      ? caller.organizations
      : [];
    const validOrganization = organizations.find(
      (org) =>
        org &&
        typeof org.name === 'string' &&
        org.name.trim() !== '' &&
        typeof org.description === 'string' &&
        org.description.trim() !== '',
    );
    if (!validOrganization) {
      throw new ForbiddenException('silahkan update organization profile');
    }

    const resolvedChainId =
      chainIdParam !== undefined && Number.isFinite(chainIdParam)
        ? chainIdParam
        : dto.chain_id !== undefined && dto.chain_id !== null && String(dto.chain_id).trim() !== ''
          ? Number(dto.chain_id)
          : undefined;

    if (resolvedChainId !== undefined && !Number.isFinite(resolvedChainId)) {
      throw new BadRequestException('Invalid chain_id');
    }

    let dbCompetitionId: string | null = null;
    let indexerStateId: string | null = null;
    let contractChecksum: `0x${string}`;

    if (dto.competition_id && String(dto.competition_id).trim() !== '') {
      const compIdInput = String(dto.competition_id).trim();
      const competition: any = await this.prisma.competition.findFirst({
        where: {
          OR: [{ id: compIdInput }, { competition_id: compIdInput }],
          deleted_at: null,
          ...(resolvedChainId !== undefined
            ? { indexer_state: { chain_id: resolvedChainId } }
            : {}),
        } as any,
        include: { indexer_state: true } as any,
      });
      if (!competition) {
        throw new NotFoundException(
          `Competition ${compIdInput} not found${resolvedChainId !== undefined ? ` on chain ${resolvedChainId}` : ''}`,
        );
      }
      dbCompetitionId = competition.id;
      indexerStateId =
        competition.indexer_state_id ?? competition.indexer_state?.id ?? null;
      try {
        contractChecksum = resolveCompetitionContractAddress(competition);
      } catch (e: any) {
        throw new BadRequestException(
          e?.message || 'Invalid COMPETITION_CONTRACT',
        );
      }
    } else {
      let defaultContract: `0x${string}`;
      try {
        defaultContract = getCompetitionContractAddress();
      } catch (e: any) {
        throw new BadRequestException(
          e?.message || 'Invalid COMPETITION_CONTRACT',
        );
      }

      if (resolvedChainId !== undefined) {
        const states: any[] = await (this.prisma as any).indexerState.findMany({
          where: { chain_id: resolvedChainId },
          orderBy: { updated_at: 'desc' },
        });
        const matchedState =
          states.find(
            (s) =>
              typeof s.contract_address === 'string' &&
              s.contract_address.toLowerCase() === defaultContract.toLowerCase(),
          ) ?? states[0];

        if (matchedState) {
          indexerStateId = matchedState.id;
          if (
            matchedState.contract_address &&
            isAddress(matchedState.contract_address)
          ) {
            contractChecksum = getAddress(matchedState.contract_address);
          } else {
            contractChecksum = defaultContract;
          }
        } else {
          contractChecksum = defaultContract;
        }
      } else {
        contractChecksum = defaultContract;
        const matchedState: any = await (
          this.prisma as any
        ).indexerState.findFirst({
          where: {
            contract_address: {
              equals: defaultContract,
              mode: 'insensitive',
            },
          },
          orderBy: { updated_at: 'desc' },
        });
        if (matchedState) {
          indexerStateId = matchedState.id;
        }
      }
    }

    if (!dto.competition) {
      return {
        data: {
          signature: null,
          chain_id: resolvedChainId ?? null,
          contract_address: contractChecksum,
        },
        message: 'Organization profile verified for competition creation',
        errors: null,
      };
    }

    const rawTopPayment = dto.payment ?? dto.competition.payment;
    if (!rawTopPayment) {
      throw new BadRequestException(
        'payment (or competition.payment) is required',
      );
    }

    const paymentStruct = this.parsePaymentStruct(rawTopPayment, 'payment');
    const compPaymentStruct = dto.competition.payment
      ? this.parsePaymentStruct(dto.competition.payment, 'competition.payment')
      : paymentStruct;

    const compIdBigInt = this.parseUint256(
      dto.competition.id ?? 0,
      'competition.id',
    );
    const cid = String(dto.competition.cid ?? '').trim();
    if (!cid) {
      throw new BadRequestException('competition.cid is required');
    }

    const formation = String(dto.competition.formation ?? '').trim();
    if (formation !== '1-3 member' && formation !== '1-5 member') {
      throw new BadRequestException(
        'Invalid competition.formation: must be "1-3 member" or "1-5 member"',
      );
    }

    let organizationAddress: `0x${string}`;
    const rawOrg = String(dto.competition.organization ?? '').trim();
    if (!rawOrg) {
      if (!caller.wallet_address || !isAddress(caller.wallet_address)) {
        throw new BadRequestException(
          'Authenticated user does not have a valid wallet_address',
        );
      }
      organizationAddress = getAddress(caller.wallet_address);
    } else {
      if (!isAddress(rawOrg)) {
        throw new BadRequestException(
          `Invalid competition.organization address: ${rawOrg}`,
        );
      }
      organizationAddress = getAddress(rawOrg);
    }

    const rawPrizeClaim =
      dto.competition.prizeCertificateClaim ??
      dto.competition.prize_certificate_claim;
    if (rawPrizeClaim === undefined || rawPrizeClaim === null || String(rawPrizeClaim).trim() === '') {
      throw new BadRequestException(
        'competition.prizeCertificateClaim is required',
      );
    }
    const prizeCertificateClaim = this.parseUint256(
      rawPrizeClaim,
      'competition.prizeCertificateClaim',
    );
    if (prizeCertificateClaim <= 0n) {
      throw new BadRequestException(
        'competition.prizeCertificateClaim must be > 0',
      );
    }

    const certificateCID = String(
      dto.competition.certificateCID ?? dto.competition.certificate_cid ?? '',
    ).trim();

    const competitionStruct: CreateCompetitionStruct = {
      id: compIdBigInt,
      cid,
      formation,
      organization: organizationAddress,
      prizeCertificateClaim,
      certificateCID,
      payment: compPaymentStruct,
    };

    if (!Array.isArray(dto.winners) || dto.winners.length === 0) {
      throw new BadRequestException('winners must be a non-empty array');
    }

    const winnersStruct: CreateCompetitionWinnerStruct[] = dto.winners.map(
      (w, idx) => {
        const wId = this.parseUint256(w.id ?? 0, `winners[${idx}].id`);
        const wCompId = this.parseUint256(
          w.competitionId ?? w.competition_id ?? 0,
          `winners[${idx}].competitionId`,
        );
        const rawPrizeToken = String(
          w.prizeToken ?? w.prize_token ?? ZERO_ADDRESS,
        ).trim();
        if (!isAddress(rawPrizeToken)) {
          throw new BadRequestException(
            `Invalid winners[${idx}].prizeToken address: ${rawPrizeToken}`,
          );
        }
        const prizeToken = getAddress(rawPrizeToken);

        const rawPrizeAmount = w.prizeAmount ?? w.prize_amount;
        if (
          rawPrizeAmount === undefined ||
          rawPrizeAmount === null ||
          String(rawPrizeAmount).trim() === ''
        ) {
          throw new BadRequestException(
            `winners[${idx}].prizeAmount is required`,
          );
        }
        const prizeAmount = this.parseUint256(
          rawPrizeAmount,
          `winners[${idx}].prizeAmount`,
        );
        if (prizeAmount <= 0n) {
          throw new BadRequestException(
            `winners[${idx}].prizeAmount must be > 0`,
          );
        }

        const wCertCid = String(
          w.certificateCID ?? w.certificate_cid ?? '',
        ).trim();

        return {
          id: wId,
          competitionId: wCompId,
          prizeToken,
          prizeAmount,
          certificateCID: wCertCid,
        };
      },
    );

    const firstPrizeToken = winnersStruct[0].prizeToken;
    for (let i = 1; i < winnersStruct.length; i++) {
      if (winnersStruct[i].prizeToken !== firstPrizeToken) {
        throw new BadRequestException(
          `winners[${i}].prizeToken (${winnersStruct[i].prizeToken}) does not match winners[0].prizeToken (${firstPrizeToken})`,
        );
      }
    }

    const rawFeeId =
      dto.priceCompetitionFeeId ?? dto.price_competition_fee_id;
    if (rawFeeId === undefined || rawFeeId === null || String(rawFeeId).trim() === '') {
      throw new BadRequestException('priceCompetitionFeeId is required');
    }
    const priceCompetitionFeeId = this.parseUint256(
      rawFeeId,
      'priceCompetitionFeeId',
    );
    if (priceCompetitionFeeId <= 0n) {
      throw new BadRequestException('priceCompetitionFeeId must be > 0');
    }

    const msgHash = hashCreateCompetition(
      contractChecksum,
      competitionStruct,
      paymentStruct,
      winnersStruct,
      priceCompetitionFeeId,
    );

    let signature: `0x${string}`;
    try {
      signature = await signHashWithSigner(msgHash);
    } catch (e: any) {
      this.logger.error(
        'Failed to sign createCompetition hash: ' + (e?.message || e),
      );
      throw new BadRequestException(
        'Failed to generate createCompetition signature — check PRIVATE_KEY_SIGNER',
      );
    }

    let row: any;
    const delegate = (this.prisma as any).signatureCreateCompetition;
    if (delegate && typeof delegate.create === 'function') {
      row = await delegate.create({
        data: {
          signature,
          ...(dbCompetitionId ? { competition_id: dbCompetitionId } : {}),
          ...(indexerStateId ? { indexer_state_id: indexerStateId } : {}),
        } as any,
      });
    } else {
      const id = ulid();
      const inserted: any[] = await this.prisma.$queryRaw`
        INSERT INTO signature_create_competition (id, signature, competition_id, indexer_state_id)
        VALUES (${id}, ${signature}, ${dbCompetitionId}, ${indexerStateId})
        RETURNING id, signature, competition_id, indexer_state_id, created_at, updated_at, deleted_at
      `;
      row = inserted[0];
    }

    return {
      data: {
        ...row,
        hash: msgHash,
        contract_address: contractChecksum,
        chain_id: resolvedChainId ?? null,
        competition: {
          id: competitionStruct.id.toString(),
          cid: competitionStruct.cid,
          formation: competitionStruct.formation,
          organization: competitionStruct.organization,
          prizeCertificateClaim:
            competitionStruct.prizeCertificateClaim.toString(),
          certificateCID: competitionStruct.certificateCID,
          payment: {
            tokenAddress: competitionStruct.payment.tokenAddress,
            fee: competitionStruct.payment.fee.toString(),
          },
        },
        payment: {
          tokenAddress: paymentStruct.tokenAddress,
          fee: paymentStruct.fee.toString(),
        },
        winners: winnersStruct.map((w) => ({
          id: w.id.toString(),
          competitionId: w.competitionId.toString(),
          prizeToken: w.prizeToken,
          prizeAmount: w.prizeAmount.toString(),
          certificateCID: w.certificateCID,
        })),
        priceCompetitionFeeId: priceCompetitionFeeId.toString(),
      },
      message: 'Signature create competition generated successfully',
      errors: null,
    };
  }

  private parsePaymentStruct(
    input: {
      tokenAddress?: string;
      token_address?: string;
      fee?: string | number;
    },
    fieldPrefix: string,
  ): CreateCompetitionPaymentStruct {
    const rawToken = String(
      input.tokenAddress ?? input.token_address ?? ZERO_ADDRESS,
    ).trim();
    if (!isAddress(rawToken)) {
      throw new BadRequestException(
        `Invalid ${fieldPrefix}.tokenAddress: ${rawToken}`,
      );
    }
    const fee = this.parseUint256(input.fee ?? 0, `${fieldPrefix}.fee`);
    return {
      tokenAddress: getAddress(rawToken),
      fee,
    };
  }

  private parseUint256(value: string | number | bigint, fieldName: string): bigint {
    try {
      const n = typeof value === 'bigint' ? value : BigInt(String(value).trim());
      if (n < 0n) {
        throw new Error('negative');
      }
      return n;
    } catch {
      throw new BadRequestException(
        `Invalid uint256 value for ${fieldName}: ${String(value)}`,
      );
    }
  }
}
