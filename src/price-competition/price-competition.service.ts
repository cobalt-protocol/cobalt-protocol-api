import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PriceCompetitionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const priceCompetitions = await this.prisma.priceCompetition.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        competitions: {
          where: {
            deleted_at: null,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!priceCompetitions || priceCompetitions.length === 0) {
      throw new NotFoundException('No price competitions found');
    }

    return {
      data: priceCompetitions,
      message: 'Price competitions retrieved successfully',
      errors: null,
    };
  }

  async findByFeeId(feeId: string) {
    let numericFeeId: bigint;
    try {
      numericFeeId = BigInt(feeId);
    } catch {
      throw new NotFoundException('Invalid price competition fee ID');
    }

    const priceCompetition = await this.prisma.priceCompetition.findFirst({
      where: {
        price_competition_fee_id: numericFeeId,
        deleted_at: null,
      },
      include: {
        competitions: {
          where: {
            deleted_at: null,
          },
        },
      },
    });

    if (!priceCompetition) {
      throw new NotFoundException('Price competition not found');
    }

    return {
      data: priceCompetition,
      message: 'Price competition retrieved successfully',
      errors: null,
    };
  }

  async findOne(id: string) {
    let whereCondition: any = {
      id,
      deleted_at: null,
    };

    if (/^\d+$/.test(id)) {
      try {
        const feeId = BigInt(id);
        whereCondition = {
          OR: [{ id }, { price_competition_fee_id: feeId }],
          deleted_at: null,
        };
      } catch {
        // Fallback to id filter if BigInt conversion fails
      }
    }

    const priceCompetition = await this.prisma.priceCompetition.findFirst({
      where: whereCondition,
      include: {
        competitions: {
          where: {
            deleted_at: null,
          },
        },
      },
    });

    if (!priceCompetition) {
      throw new NotFoundException('Price competition not found');
    }

    return {
      data: priceCompetition,
      message: 'Price competition retrieved successfully',
      errors: null,
    };
  }
}

