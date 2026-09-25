import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCompetitionTeamDto } from './dto/create-team.dto.js';

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
          nonceCertificateParticipants: {
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
          nonceCertificateWinners: {
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

  async findMyTeams(authHeader?: string) {
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

    const teams = await this.prisma.team.findMany({
      where: {
        OR: [
          { user_id: user.id },
          {
            team_roles: {
              some: {
                user_id: user.id,
              },
            },
          },
        ],
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
        OR: [{ id }, { competition_id: id }, { slug: id }],
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
        ],
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
    });

    return {
      data: team,
      message: team
        ? 'Team retrieved successfully'
        : 'No team found for this competition',
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
        OR: [{ id }, { competition_id: id }, { slug: id }],
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

    const skillsList =
      dto.skills ?? dto.skills_suggestion ?? dto.skills_suggestions ?? [];

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
        user_id: user.id,
        skills_suggestions: {
          create: skillsList
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter((name) => name.length > 0)
            .map((name) => ({ name })),
        },
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
              user_id: user.id,
              competition_id: competition.id,
              role: 'LEAD',
            },
          ],
        },
      },
      include: {
        skills_suggestions: true,
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
        skills_suggestions: team.skills_suggestions,
        created_at: team.created_at,
        updated_at: team.updated_at,
      },
      message: 'Team created successfully',
      errors: null,
    };
  }
}

