import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CompetitionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const competitions = await this.prisma.competition.findMany({
      where: {
        deleted_at: null,
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

    return {
      data: competitions,
      message: 'Competitions retrieved successfully',
      errors: null,
    };
  }
}
