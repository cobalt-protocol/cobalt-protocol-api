import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrizeWinnerService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompetitionId(competitionId: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
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

  async getTokenPrizeByCompetitionId(competitionId: string) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        OR: [{ id: competitionId }, { competition_id: competitionId }],
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
