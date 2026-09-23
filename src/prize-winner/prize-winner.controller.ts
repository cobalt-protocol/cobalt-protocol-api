import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrizeWinnerService } from './prize-winner.service.js';

@ApiTags('Prize Winners')
@Controller('prize-winners')
export class PrizeWinnerController {
  constructor(private readonly prizeWinnerService: PrizeWinnerService) {}

  @Get('competition/:competition_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get prize winners by competition ID',
  })
  @ApiParam({
    name: 'competition_id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Prize winners retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '01J8Z9X0000000000000000002',
            winner_id: '1',
            category: '1st Place',
            amount: '1000.000000000000000000',
            certificate_cid: 'QmWinnerCert123...',
            competition_id: '01J8Z9X0000000000000000001',
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
            winner: {
              id: '01J8Z9X0000000000000000003',
              wallet_address: '0x1234567890123456789012345678901234567890',
              user_id: '01J8Z9X0000000000000000004',
              prize_winner_id: '01J8Z9X0000000000000000002',
              user: {
                id: '01J8Z9X0000000000000000004',
                wallet_address: '0x1234567890123456789012345678901234567890',
                username: 'alice',
                email: 'alice@example.com',
                location: 'Jakarta',
                institution: 'ITB',
              },
            },
          },
        ],
        message: 'Prize winners retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or prize winners not found',
    schema: {
      example: {
        data: null,
        message: 'No prize winners found for this competition',
        errors: null,
      },
    },
  })
  async findByCompetitionId(@Param('competition_id') competitionId: string) {
    return this.prizeWinnerService.findByCompetitionId(competitionId);
  }

  @Get(':competition_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get prize winners by competition ID',
  })
  @ApiParam({
    name: 'competition_id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Prize winners retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or prize winners not found',
  })
  async findByCompetitionIdDirect(@Param('competition_id') competitionId: string) {
    return this.prizeWinnerService.findByCompetitionId(competitionId);
  }

  @Get('token-prize/:competition_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get token prize and total prize amount by competition ID',
  })
  @ApiParam({
    name: 'competition_id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Token prize retrieved successfully',
    schema: {
      example: {
        data: {
          competition_id: '01J8Z9X0000000000000000001',
          onchain_competition_id: '1',
          token_address: '0x1234567890123456789012345678901234567890',
          total_prize: '1750',
          prize_winners_count: 3,
        },
        message: 'Token prize retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found',
  })
  async getTokenPrizeByCompetitionId(@Param('competition_id') competitionId: string) {
    return this.prizeWinnerService.getTokenPrizeByCompetitionId(competitionId);
  }

  @Get(':competition_id/token-prize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get token prize and total prize amount by competition ID',
  })
  @ApiParam({
    name: 'competition_id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Token prize retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found',
  })
  async getTokenPrizeByCompetitionIdDirect(@Param('competition_id') competitionId: string) {
    return this.prizeWinnerService.getTokenPrizeByCompetitionId(competitionId);
  }
}
