import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getAddress, isAddress } from 'viem';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  deriveNumericTeamId,
  getCompetitionContractAddress,
  resolveCompetitionContractAddress,
  hashParticipantCertificate,
  hashWinnerCertificate,
  signHashWithSigner,
} from '../common/utils/certificate-signature.util.js';
import {
  buildParticipantCertificateMetadata,
  buildWinnerCertificateMetadata,
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

  async getParticipantWinnersByCompetitionId(competitionId: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
        deleted_at: null,
      },
      select: {
        id: true,
        competition_id: true,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found`,
      );
    }

    const participantWinners = await this.prisma.participantWinner.findMany({
      where: {
        competition_id: competition.id,
        deleted_at: null,
      },
      include: {
        prize_winner: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const participantWallets = participantWinners
      .map((pw) => pw.participant)
      .filter((p): p is string => Boolean(p));

    const users = participantWallets.length > 0
      ? await this.prisma.user.findMany({
          where: {
            wallet_address: {
              in: participantWallets,
              mode: 'insensitive',
            },
            deleted_at: null,
          },
          select: {
            id: true,
            wallet_address: true,
            username: true,
            email: true,
            location: true,
            institution: true,
          },
        })
      : [];

    const teams = await this.prisma.team.findMany({
      where: {
        competition_id: competition.id,
        deleted_at: null,
      },
      include: {
        team_roles: {
          where: { deleted_at: null },
        },
      },
    });

    const data = participantWinners.map((pw) => {
      const user = users.find(
        (u) => u.wallet_address.toLowerCase() === pw.participant.toLowerCase(),
      ) || null;

      const team = teams.find(
        (t) =>
          (user && t.user_id === user.id) ||
          (user && t.team_roles.some((r) => r.user_id === user.id)),
      );

      return {
        id: pw.id,
        tx_hash: pw.tx_hash,
        participant: pw.participant,
        title: pw.title,
        competition_id: pw.competition_id,
        prize_winner_id: pw.prize_winner_id ? pw.prize_winner_id.toString() : null,
        created_at: pw.created_at,
        updated_at: pw.updated_at,
        deleted_at: pw.deleted_at,
        user,
        prize_winner: pw.prize_winner
          ? {
              ...pw.prize_winner,
              winner_id: pw.prize_winner.winner_id ? pw.prize_winner.winner_id.toString() : null,
              amount: pw.prize_winner.amount ? pw.prize_winner.amount.toString() : '0',
            }
          : null,
        team: team
          ? {
              id: team.id,
              name: team.name,
              visibility: team.visibility,
              description: team.description,
            }
          : null,
      };
    });

    return {
      data,
      message: 'Participant winners retrieved successfully',
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
      | {
          id: string;
          competition_id: string;
          fee_token_address?: string | null;
        }
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
        ?.token_address ||
      competition.fee_token_address ||
      null;

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
      throw new BadRequestException(
        'teamId is required — use GET :id/signature-certificate-participant/:teamId',
      );
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
      include: { indexer_state: true },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    if (!user.wallet_address || !isAddress(user.wallet_address)) {
      throw new BadRequestException(
        'Authenticated user has no valid wallet address',
      );
    }
    const team: any = await (async () => {
      const found = await this.prisma.team.findFirst({
        where: { id: teamId, competition_id: competition.id, deleted_at: null },
        include: { team_roles: true } as any,
      });
      if (!found)
        throw new NotFoundException('Team not found for this competition');
      const isMember =
        found.user_id === user.id ||
        (Array.isArray((found as any).team_roles) &&
          (found as any).team_roles.some((r: any) => r.user_id === user.id));
      if (isMember) return found;
      const membership = await this.prisma.team.findFirst({
        where: {
          id: teamId,
          competition_id: competition.id,
          deleted_at: null,
          OR: [
            { user_id: user.id },
            { team_roles: { some: { user_id: user.id } } },
          ],
        },
      });
      if (!membership)
        throw new ForbiddenException(
          'You are not a member of the specified team',
        );
      return membership;
    })();
    if (
      competition.competition_id === null ||
      competition.competition_id === undefined ||
      String(competition.competition_id).trim() === ''
    ) {
      throw new BadRequestException(
        'Competition is not yet indexed on-chain (competition_id is null). Minting is not available yet.',
      );
    }
    let onchainCompId: bigint;
    try {
      onchainCompId = BigInt(competition.competition_id);
    } catch {
      throw new BadRequestException(
        `Invalid on-chain competition_id: ${competition.competition_id}`,
      );
    }
    if (onchainCompId <= 0n)
      throw new BadRequestException(
        `Invalid on-chain competition_id: ${competition.competition_id}`,
      );

    // ── Validate submission_project exists for this team ───────────────────
    // Required: table submission_project for team must not be empty, otherwise 400.
    const submission: any =
      (await (this.prisma as any).submissionProject?.findFirst?.({
        where: { team_id: team.id, deleted_at: null },
      })) ?? null;

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
      submission,
      competition,
      team,
    });

    // Pin metadata JSON to IPFS to obtain CID (raw, without ipfs:// prefix)
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
    try {
      contractChecksum = resolveCompetitionContractAddress(competition as any);
    } catch (e: any) {
      throw new BadRequestException(
        e?.message || 'Invalid COMPETITION_CONTRACT',
      );
    }
    const participantChecksum = getAddress(user.wallet_address);
    // hash uses the newly pinned metadata CID (raw) — matches safeMintCertificateParticipant(_cid) on-chain
    const msgHash = hashParticipantCertificate(
      contractChecksum,
      participantChecksum,
      onchainCompId,
      team.id,
      metadataCidRaw,
    );
    let signature: `0x${string}`;
    try {
      signature = await signHashWithSigner(msgHash);
    } catch (e: any) {
      this.logger.error(`Failed to sign participant certificate hash: ${e}`);
      throw new BadRequestException(
        'Failed to generate participant certificate signature',
      );
    }
    const existingSig: any =
      await this.prisma.signatureCertificateParticipant.findFirst({
        where: {
          user_id: user.id,
          competition_id: competition.id,
          team_id: team.id,
          deleted_at: null,
        },
      } as any);
    let signatureCertificateParticipant: any;
    if (!existingSig) {
      signatureCertificateParticipant =
        await this.prisma.signatureCertificateParticipant.create({
          data: {
            signature,
            user_id: user.id,
            competition_id: competition.id,
            team_id: team.id,
          },
        });
    } else if (
      existingSig.signature !== signature ||
      existingSig.team_id !== team.id
    ) {
      signatureCertificateParticipant =
        await this.prisma.signatureCertificateParticipant.update({
          where: { id: existingSig.id },
          data: { signature, team_id: team.id },
        });
    } else {
      signatureCertificateParticipant = existingSig;
    }
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

  async findSignatureCertificateWinner(
    id: string,
    winnerIdParam: string | undefined,
    authHeader?: string,
  ) {
    if (!authHeader)
      throw new UnauthorizedException('Missing authorization header');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid authorization header format');
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const userId = payload.sub ?? null;
    const walletAddress = payload.wallet_address ?? null;
    if (!userId && !walletAddress)
      throw new UnauthorizedException('Invalid token payload');
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
    if (!user) throw new UnauthorizedException('User not found');
    const competition = await this.prisma.competition.findFirst({
      where: { OR: [{ id }, { competition_id: id }], deleted_at: null },
      include: { indexer_state: true },
    });
    if (!competition) throw new NotFoundException('Competition not found');
    if (!user.wallet_address || !isAddress(user.wallet_address))
      throw new BadRequestException(
        'Authenticated user has no valid wallet address',
      );

    // 1. Query table team_role menggunakan user_id dari middleware header authentication
    const userTeamRoles = await this.prisma.teamRole.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
      },
      select: { team_id: true },
    });

    // 2. Ambil kolom team_id
    const teamIds = [
      ...new Set(
        userTeamRoles
          .map((tr) => tr.team_id)
          .filter((tid): tid is string => Boolean(tid)),
      ),
    ];

    if (teamIds.length === 0) {
      throw new ForbiddenException(
        'Forbidden - user has no team in team_role',
      );
    }

    // 3. Query ke table participant_winner menggunakan kolom team_id
    let bigWinnerId: bigint | null = null;
    if (winnerIdParam) {
      try {
        bigWinnerId = BigInt(winnerIdParam);
      } catch {
        bigWinnerId = null;
      }
    }

    const participantWinners = await this.prisma.participantWinner.findMany({
      where: {
        team_id: { in: teamIds },
        competition_id: competition.id,
        deleted_at: null,
        ...(winnerIdParam
          ? {
              OR: [
                { id: winnerIdParam },
                ...(bigWinnerId !== null ? [{ prize_winner_id: bigWinnerId }] : []),
                { prize_winner: { id: winnerIdParam } },
              ],
            }
          : {}),
      },
      include: {
        prize_winner: true,
        team: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // 4. Kalau hasil querynya kosong kembalikan 403
    if (!participantWinners || participantWinners.length === 0) {
      throw new ForbiddenException(
        'Forbidden - user team is not recorded as a participant winner for this competition',
      );
    }

    const selectedParticipantWinner = participantWinners[0];
    const team =
      selectedParticipantWinner.team ??
      (await this.prisma.team.findFirst({
        where: { id: selectedParticipantWinner.team_id! },
      }));
    if (!team) {
      throw new NotFoundException('Team not found for participant winner');
    }

    let onchainWinnerId: bigint | null = null;
    if (
      selectedParticipantWinner.prize_winner_id !== null &&
      selectedParticipantWinner.prize_winner_id !== undefined
    ) {
      onchainWinnerId = BigInt(selectedParticipantWinner.prize_winner_id);
    } else if (
      selectedParticipantWinner.prize_winner?.winner_id !== undefined &&
      selectedParticipantWinner.prize_winner?.winner_id !== null
    ) {
      onchainWinnerId = BigInt(selectedParticipantWinner.prize_winner.winner_id);
    } else if (bigWinnerId !== null) {
      onchainWinnerId = bigWinnerId;
    }

    if (!onchainWinnerId || onchainWinnerId === 0n) {
      throw new BadRequestException('Invalid winnerId (0)');
    }

    const prizeWinnerRecord =
      selectedParticipantWinner.prize_winner ??
      (await this.prisma.prizeWinner.findFirst({
        where: {
          competition_id: competition.id,
          winner_id: onchainWinnerId,
          deleted_at: null,
        },
      }));
    const titleWinner =
      prizeWinnerRecord?.category ?? selectedParticipantWinner.title ?? null;

    const submission = await this.prisma.submissionProject.findFirst({
      where: { team_id: team.id, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (!submission) {
      throw new BadRequestException(
        'Team has not submitted any project yet (submission_project is empty) — cannot generate winner certificate signature',
      );
    }

    const metadata = buildWinnerCertificateMetadata({
      submission,
      competition,
      team,
      title_winner: titleWinner,
      prize_winner: prizeWinnerRecord,
    });

    let metadataCidRaw: string;
    try {
      metadataCidRaw = await pinJsonToIpfs(metadata);
    } catch (e: any) {
      this.logger.error(
        `Failed to pin winner certificate metadata to IPFS: ${e?.message || e}`,
      );
      throw new BadRequestException(
        e?.message || 'Failed to pin certificate metadata to IPFS',
      );
    }

    let contractChecksum: `0x${string}`;
    try {
      contractChecksum = resolveCompetitionContractAddress(competition as any);
    } catch (e: any) {
      throw new BadRequestException(
        e?.message || 'Invalid COMPETITION_CONTRACT',
      );
    }
    const participantChecksum = getAddress(user.wallet_address);
    const msgHash = hashWinnerCertificate(
      contractChecksum,
      participantChecksum,
      onchainWinnerId,
      metadataCidRaw,
    );
    let signature: `0x${string}`;
    try {
      signature = await signHashWithSigner(msgHash);
    } catch (e: any) {
      this.logger.error(`Failed to sign winner certificate hash: ${e}`);
      throw new BadRequestException(
        'Failed to generate winner certificate signature',
      );
    }
    const existingWinnerSig: any =
      await this.prisma.signatureCertificateWinner.findFirst({
        where: {
          user_id: user.id,
          competition_id: competition.id,
          deleted_at: null,
        },
      });
    let winnerSig: any;
    if (!existingWinnerSig)
      winnerSig = await this.prisma.signatureCertificateWinner.create({
        data: {
          signature,
          user_id: user.id,
          competition_id: competition.id,
          team_id: team.id,
        },
      });
    else if (
      existingWinnerSig.signature !== signature ||
      existingWinnerSig.team_id !== team.id
    )
      winnerSig = await this.prisma.signatureCertificateWinner.update({
        where: { id: existingWinnerSig.id },
        data: { signature, team_id: team.id },
      });
    else winnerSig = existingWinnerSig;
    const uri = metadataCidRaw ? `ipfs://${metadataCidRaw}` : '';
    return {
      data: {
        ...winnerSig,
        winner_id: onchainWinnerId.toString(),
        cid: metadataCidRaw,
        certificate_cid: metadataCidRaw,
        uri,
        metadata,
      },
      message: 'Signature certificate winner retrieved successfully',
      errors: null,
    };
  }
}
