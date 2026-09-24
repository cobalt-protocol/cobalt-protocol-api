import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

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
        this.logger.warn(`Could not lookup user during competition filter: ${dbError}`);
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
          nonce_certificate_participants: {
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
          nonce_certificate_winners: {
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

  async findListingTokenPrizes() {
    const listingTokenPrizes = await this.prisma.listingTokenPrize.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!listingTokenPrizes || listingTokenPrizes.length === 0) {
      throw new NotFoundException('No listing token prizes found');
    }

    return {
      data: listingTokenPrizes,
      message: 'Listing token prizes retrieved successfully',
      errors: null,
    };
  }

  async findOne(id: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        id,
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
      throw new NotFoundException('No prize winners found for this competition');
    }

    return {
      data: prizeWinners,
      message: 'Prize winners retrieved successfully',
      errors: null,
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
      prizeDeposits.find((d) => Boolean(d.token_address))?.token_address ||
      competition.token_address;

    return {
      data: {
        competition_id: competition.id,
        onchain_competition_id: competition.competition_id,
        token_address: tokenAddress,
        total_prize: totalPrizeBigInt.toString(),
        prize_deposits_count: prizeDeposits.length,
      },
      message: 'Token prize retrieved successfully',
      errors: null,
    };
  }
}

