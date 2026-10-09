import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ChainService {
  constructor(private readonly prisma: PrismaService) {}

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
        indexer_state: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!competitions || competitions.length === 0) {
      throw new NotFoundException(`No competitions found for chain ID ${chainId}`);
    }

    return {
      data: competitions,
      message: 'Competitions retrieved successfully',
      errors: null,
    };
  }
}
