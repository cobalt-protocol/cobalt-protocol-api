import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { getAddress, isAddress } from 'viem';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCompetitionTeamDto } from './dto/create-team.dto.js';
import {
  deriveNumericTeamId,
  getCompetitionContractAddress,
  hashParticipantCertificate,
  hashWinnerCertificate,
  signHashWithSigner,
} from '../common/utils/certificate-signature.util.js';
import {
  buildParticipantCertificateMetadata,
  pinJsonToIpfs,
} from '../common/utils/ipfs.util.js';

@Injectable()
export class CompetitionService {
  private readonly logger = new Logger(CompetitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(authHeader?: string) {
    let userId: string | null = null;
    let walletAddress: string | null = null;

    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid authorization header format');
      }

      try {
        const payload = await this.jwtService.verifyAsync(token);
        userId = payload.sub ?? null;
        walletAddress = payload.wallet_address ?? null;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }

      if (!userId && !walletAddress) {
        throw new UnauthorizedException('Invalid token payload');
      }

      try {
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

        if (user) {
          userId = user.id;
          walletAddress = user.wallet_address;
        }
      } catch (dbError) {
        this.logger.warn(
          `Could not lookup user during competition filter: ${dbError}`,
        );
      }
    }

    const whereClause: any = {
      deleted_at: null,
    };

    if (userId || walletAddress) {
      const userConditions: any[] = [];
      if (userId) {
        userConditions.push({ user_id: userId });
      }
      if (walletAddress) {
        userConditions.push({
          user: {
            wallet_address: {
              equals: walletAddress,
              mode: 'insensitive',
            },
          },
        });
      }

      whereClause.OR = [
        ...userConditions,
        {
          teams: {
            some: {
              OR: [
                ...(userId ? [{ user_id: userId }] : []),
                ...(walletAddress
                  ? [
                      {
                        user: {
                          wallet_address: {
                            equals: walletAddress,
                            mode: 'insensitive',
                          },
                        },
                      },
                    ]
                  : []),
                {
                  team_roles: {
                    some: {
                      OR: [
                        ...(userId ? [{ user_id: userId }] : []),
                        ...(walletAddress
                          ? [
                              {
                                user: {
                                  wallet_address: {
                                    equals: walletAddress,
                                    mode: 'insensitive',
                                  },
                                },
                              },
                            ]
                          : []),
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        {
          prize_winners: {
            some: {
              winner: {
                OR: [
                  ...(userId ? [{ user_id: userId }] : []),
                  ...(walletAddress
                    ? [
                        {
                          user: {
                            wallet_address: {
                              equals: walletAddress,
                              mode: 'insensitive',
                            },
                          },
                        },
                      ]
                    : []),
                ],
              },
            },
          },
        },
        {
          signature_certificate_participant: {
            some: {
              OR: [
                ...(userId ? [{ user_id: userId }] : []),
                ...(walletAddress
                  ? [
                      {
                        user: {
                          wallet_address: {
                            equals: walletAddress,
                            mode: 'insensitive',
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
        },
        {
          signature_certificate_winner: {
            some: {
              OR: [
                ...(userId ? [{ user_id: userId }] : []),
                ...(walletAddress
                  ? [
                      {
                        user: {
                          wallet_address: {
                            equals: walletAddress,
                            mode: 'insensitive',
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      ];
    }

    const competitions = await this.prisma.competition.findMany({
      where: whereClause,
      include: {
        prize_winners: {
          where: {
            deleted_at: null,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!competitions || competitions.length === 0) {
      throw new NotFoundException('No competitions found');
    }

    return {
      data: competitions,
      message: 'Competitions retrieved successfully',
      errors: null,
    };
  }

  async findOrganizationCompetitions(authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    let userId: string | null = null;
    let walletAddress: string | null = null;

    try {
      const payload = await this.jwtService.verifyAsync(token);
      userId = payload.sub ?? null;
      walletAddress = payload.wallet_address ?? null;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

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

    const userConditions: any[] = [{ user_id: user.id }];
    if (user.wallet_address) {
      userConditions.push({
        user: {
          wallet_address: {
            equals: user.wallet_address,
            mode: 'insensitive',
          },
        },
      });
    }

    const competitions = await this.prisma.competition.findMany({
      where: {
        deleted_at: null,
        OR: userConditions,
      },
      include: {
        prize_winners: {
          where: {
            deleted_at: null,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!competitions || competitions.length === 0) {
      throw new NotFoundException('No organization competitions found');
    }

    return {
      data: competitions,
      message: 'Organization competitions retrieved successfully',
      errors: null,
    };
  }

  async findListingTokenPrizes() {
    const listingTokens = await this.prisma.listingToken.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!listingTokens || listingTokens.length === 0) {
      throw new NotFoundException('No listing tokens found');
    }

    return {
      data: listingTokens,
      message: 'Listing tokens retrieved successfully',
      errors: null,
    };
  }

  async findMyTeamByCompetitionId(id: string, authHeader?: string) {
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
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const team = await this.prisma.team.findFirst({
      where: {
        competition_id: competition.id,
        deleted_at: null,
        OR: [
          { user_id: user.id },
          {
            team_roles: {
              some: {
                user_id: user.id,
              },
            },
          },
          {
            request_joins: {
              some: {
                user_id: user.id,
                status: 'pending',
                deleted_at: null,
              },
            },
          },
        ],
      },
      include: {
        skills_team: true,
        requirements_team: true,
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
        request_joins: {
          where: {
            deleted_at: null,
          },
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
    });

    return {
      data: team,
      message: team
        ? 'Team retrieved successfully'
        : 'No team found for this competition',
      errors: null,
    };
  }

  async findTeamsByCompetitionId(id: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }],
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
        skills_team: true,
        requirements_team: true,
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

  async findOne(id: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
      },
      include: {
        prize_winners: {
          where: {
            deleted_at: null,
          },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    return {
      data: competition,
      message: 'Competition retrieved successfully',
      errors: null,
    };
  }

  async findPrizeWinners(id: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const prizeWinners = await this.prisma.prizeWinner.findMany({
      where: {
        competition_id: competition.id,
        deleted_at: null,
      },
      include: {
        winner: {
          where: {
            deleted_at: null,
          },
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

    if (!prizeWinners || prizeWinners.length === 0) {
      throw new NotFoundException(
        'No prize winners found for this competition',
      );
    }

    return {
      data: prizeWinners,
      message: 'Prize winners retrieved successfully',
      errors: null,
    };
  }

  private computeTokenPrize(
    competition:
      | { id: string; competition_id: string; fee_token_address?: string | null }
      | null
      | undefined,
    prizeDeposits: { token_address: string; amount: { toString(): string } }[],
  ) {
    if (!competition) {
      return null;
    }

    let totalPrizeBigInt = 0n;
    for (const deposit of prizeDeposits) {
      if (deposit.amount) {
        const strVal = deposit.amount.toString();
        const intPart = strVal.split('.')[0] || '0';
        try {
          totalPrizeBigInt += BigInt(intPart);
        } catch {
          totalPrizeBigInt += BigInt(Math.floor(Number(strVal)));
        }
      }
    }

    const tokenAddress =
      prizeDeposits.find((deposit) => Boolean(deposit.token_address))
        ?.token_address || competition.fee_token_address || null;

    return {
      competition_id: competition.id,
      onchain_competition_id: competition.competition_id,
      token_address: tokenAddress,
      total_prize: totalPrizeBigInt.toString(),
      prize_deposits_count: prizeDeposits.length,
    };
  }

  async getTokenPrizeByCompetitionId(id: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const prizeDeposits = await this.prisma.prizeDeposited.findMany({
      where: {
        competition_id: competition.id,
        deleted_at: null,
      },
      select: {
        token_address: true,
        amount: true,
      },
    });

    return {
      data: this.computeTokenPrize(competition, prizeDeposits),
      message: 'Token prize retrieved successfully',
      errors: null,
    };
  }

  async findSignatureCertificateParticipant(
    id: string,
    teamId: string,
    authHeader: string,
  ) {
    if (!teamId) {
      throw new BadRequestException('teamId is required — use GET :id/signature-certificate-participant/:teamId');
    }
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
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    if (!user.wallet_address || !isAddress(user.wallet_address)) {
      throw new BadRequestException('Authenticated user has no valid wallet address');
    }
    const team: any = await (async () => {
      const found = await this.prisma.team.findFirst({
        where: { id: teamId, competition_id: competition.id, deleted_at: null },
        include: { team_roles: true } as any,
      });
      if (!found) throw new NotFoundException('Team not found for this competition');
      const isMember =
        found.user_id === user.id ||
        (Array.isArray((found as any).team_roles) && (found as any).team_roles.some((r: any) => r.user_id === user.id));
      if (isMember) return found;
      const membership = await this.prisma.team.findFirst({
        where: {
          id: teamId,
          competition_id: competition.id,
          deleted_at: null,
          OR: [{ user_id: user.id }, { team_roles: { some: { user_id: user.id } } }],
        },
      });
      if (!membership) throw new ForbiddenException('You are not a member of the specified team');
      return membership;
    })();
    if (competition.competition_id === null || competition.competition_id === undefined || String(competition.competition_id).trim() === '') {
      throw new BadRequestException('Competition is not yet indexed on-chain (competition_id is null). Minting is not available yet.');
    }
    let onchainCompId: bigint;
    try { onchainCompId = BigInt(competition.competition_id); } catch { throw new BadRequestException(`Invalid on-chain competition_id: ${competition.competition_id}`); }
    if (onchainCompId <= 0n) throw new BadRequestException(`Invalid on-chain competition_id: ${competition.competition_id}`);

    // ── Validate submission_project exists for this team ───────────────────
    // Required: table submission_project for team must not be empty, otherwise 400.
    const submission: any = await (this.prisma as any).submissionProject?.findFirst?.({
      where: { team_id: team.id, deleted_at: null },
    }) ?? null;

    if (!submission) {
      throw new BadRequestException(
        'Team has not submitted any project yet (submission_project is empty) — cannot generate participant certificate signature',
      );
    }

    // Build JSON metadata from submission_project + competition
    // - title_project        <- submission_project.title
    // - description_project  <- submission_project.description
    // - submission_link      <- submission_project.submission_link
    // - document_cid         <- submission_project.document_cid
    // - title                <- competition.name
    // - description          <- competition.description
    // - image                <- ipfs:// + competition.certificate_cid
    const metadata = buildParticipantCertificateMetadata({
      submission: {
        title: submission.title,
        description: submission.description ?? null,
        submission_link: submission.submission_link,
        document_cid: submission.document_cid,
      },
      competition: {
        name: competition.name,
        description: competition.description,
        certificate_cid: competition.certificate_cid ?? '',
      },
    });

    // Pin metadata JSON to IPFS to obtain CID (raw, without ipfs:// prefix)
    let metadataCidRaw: string;
    try {
      metadataCidRaw = await pinJsonToIpfs(metadata);
    } catch (e: any) {
      this.logger.error(`Failed to pin participant certificate metadata to IPFS: ${e?.message || e}`);
      throw new BadRequestException(e?.message || 'Failed to pin certificate metadata to IPFS');
    }

    let contractChecksum: `0x${string}`;
    try { contractChecksum = getCompetitionContractAddress(); } catch (e: any) { throw new BadRequestException(e?.message || 'Invalid COMPETITION_CONTRACT'); }
    const participantChecksum = getAddress(user.wallet_address);
    const numericTeamId = deriveNumericTeamId(team.id);
    // hash uses the newly pinned metadata CID (raw) — matches safeMintCertificateParticipant(_cid) on-chain
    const msgHash = hashParticipantCertificate(contractChecksum, participantChecksum, onchainCompId, numericTeamId, metadataCidRaw);
    let signature: `0x${string}`;
    try { signature = await signHashWithSigner(msgHash); } catch (e: any) { this.logger.error(`Failed to sign participant certificate hash: ${e}`); throw new BadRequestException('Failed to generate participant certificate signature'); }
    const existingSig: any = await this.prisma.signatureCertificateParticipant.findFirst({ where: { user_id: user.id, competition_id: competition.id, team_id: team.id, deleted_at: null } } as any);
    let signatureCertificateParticipant: any;
    if (!existingSig) {
      signatureCertificateParticipant = await this.prisma.signatureCertificateParticipant.create({ data: { signature, user_id: user.id, competition_id: competition.id, team_id: team.id } });
    } else if (existingSig.signature !== signature || existingSig.team_id !== team.id) {
      signatureCertificateParticipant = await this.prisma.signatureCertificateParticipant.update({ where: { id: existingSig.id }, data: { signature, team_id: team.id } });
    } else { signatureCertificateParticipant = existingSig; }
    const uri = metadataCidRaw ? `ipfs://${metadataCidRaw}` : '';
    return {
      data: {
        ...signatureCertificateParticipant,
        // expose newly generated CID / metadata for frontend minting
        cid: metadataCidRaw,
        uri,
        metadata,
        certificate_cid: metadataCidRaw,
      },
      message: 'Signature certificate participant retrieved successfully',
      errors: null,
    };
  }

  async findSignatureCertificateWinner(id: string, winnerIdParam: string | undefined, authHeader?: string) {
    if (!authHeader) throw new UnauthorizedException('Missing authorization header');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Invalid authorization header format');
    let payload: any;
    try { payload = await this.jwtService.verifyAsync(token); } catch { throw new UnauthorizedException('Invalid or expired token'); }
    const userId = payload.sub ?? null;
    const walletAddress = payload.wallet_address ?? null;
    if (!userId && !walletAddress) throw new UnauthorizedException('Invalid token payload');
    const user = await this.prisma.user.findFirst({ where: { OR: [...(userId ? [{ id: userId }] : []), ...(walletAddress ? [{ wallet_address: { equals: walletAddress, mode: 'insensitive' as const } }] : [])] } });
    if (!user) throw new UnauthorizedException('User not found');
    const competition = await this.prisma.competition.findFirst({ where: { OR: [{ id }, { competition_id: id }], deleted_at: null } });
    if (!competition) throw new NotFoundException('Competition not found');
    if (!user.wallet_address || !isAddress(user.wallet_address)) throw new BadRequestException('Authenticated user has no valid wallet address');
    const team = await this.prisma.team.findFirst({ where: { competition_id: competition.id, deleted_at: null, OR: [{ user_id: user.id }, { team_roles: { some: { user_id: user.id } } }] }, orderBy: { created_at: 'asc' } });
    if (!team) throw new NotFoundException('You have no team for this competition — join or create a team first');
    let onchainWinnerId: bigint | null = null;
    let certificateCidRaw = '';
    if (winnerIdParam) {
      let big: bigint | null = null; try { big = BigInt(winnerIdParam); } catch { big = null; }
      const prizeWinner: any = await this.prisma.prizeWinner.findFirst({ where: { OR: [{ id: winnerIdParam }, ...(big !== null ? [{ winner_id: big } as any] : [])], competition_id: competition.id, deleted_at: null }, include: { winner: true } as any });
      if (!prizeWinner) throw new NotFoundException('Winner not found for this competition');
      onchainWinnerId = BigInt(prizeWinner.winner_id);
      certificateCidRaw = prizeWinner.certificate_cid ?? '';
      if ((prizeWinner as any).winner && (prizeWinner as any).winner.user_id !== user.id) throw new BadRequestException('You are not the winner for the specified winner_id');
    } else {
      const winnerLink: any = await this.prisma.winner.findFirst({ where: { user_id: user.id, deleted_at: null }, include: { prize_winner: true } as any });
      if (winnerLink && (winnerLink as any).prize_winner && (winnerLink as any).prize_winner.competition_id === competition.id) {
        const pw = (winnerLink as any).prize_winner; onchainWinnerId = BigInt(pw.winner_id); certificateCidRaw = pw.certificate_cid ?? '';
      }
      if (onchainWinnerId === null) throw new NotFoundException('You are not a winner for this competition');
    }
    if (onchainWinnerId === 0n) throw new BadRequestException('Invalid winnerId (0)');
    let contractChecksum: `0x${string}`;
    try { contractChecksum = getCompetitionContractAddress(); } catch (e: any) { throw new BadRequestException(e?.message || 'Invalid COMPETITION_CONTRACT'); }
    const participantChecksum = getAddress(user.wallet_address);
    const uri = certificateCidRaw ? `ipfs://${certificateCidRaw}` : '';
    const msgHash = hashWinnerCertificate(contractChecksum, participantChecksum, onchainWinnerId, uri);
    let signature: `0x${string}`;
    try { signature = await signHashWithSigner(msgHash); } catch (e: any) { this.logger.error(`Failed to sign winner certificate hash: ${e}`); throw new BadRequestException('Failed to generate winner certificate signature'); }
    const existingWinnerSig: any = await this.prisma.signatureCertificateWinner.findFirst({ where: { user_id: user.id, competition_id: competition.id, deleted_at: null } });
    let winnerSig: any;
    if (!existingWinnerSig) winnerSig = await this.prisma.signatureCertificateWinner.create({ data: { signature, user_id: user.id, competition_id: competition.id, team_id: team.id } });
    else if (existingWinnerSig.signature !== signature || existingWinnerSig.team_id !== team.id) winnerSig = await this.prisma.signatureCertificateWinner.update({ where: { id: existingWinnerSig.id }, data: { signature, team_id: team.id } });
    else winnerSig = existingWinnerSig;
    return { data: { ...winnerSig, winner_id: onchainWinnerId.toString(), uri }, message: 'Signature certificate winner retrieved successfully', errors: null };
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
        OR: [{ id }, { competition_id: id }],
        deleted_at: null,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const isPrivate = !dto.visibility;
    const teamCodeStr = isPrivate
      ? `COBALT-${randomBytes(5).toString('hex').toUpperCase()}`
      : null;

    const teamName =
      dto.name && dto.name.trim()
        ? dto.name.trim()
        : `Team ${randomBytes(3).toString('hex').toUpperCase()}`;

    try {
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
          created_at: team.created_at,
          updated_at: team.updated_at,
        },
        message: 'Team created successfully',
        errors: null,
      };
    } catch (error) {
      this.logger.error(`Failed to create team: ${error}`);
      throw error;
    }
  }
}
