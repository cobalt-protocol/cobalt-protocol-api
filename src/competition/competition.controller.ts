import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get list of all competitions',
  })
  @ApiResponse({
    status: 200,
    description: 'Competitions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '01J8Z9X0000000000000000001',
            tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            name: 'Cobalt Hackathon 2026',
            category: 'Web3 & AI',
            description: 'Building decentralized AI applications',
            requirement: 'Open to all developers',
            registration_window: '2026-10-01T00:00:00.000Z',
            competition_window: '2026-10-15T00:00:00.000Z',
            submission_deadline: '2026-11-01T00:00:00.000Z',
            judging_review: '2026-11-05T00:00:00.000Z',
            result_announcement: '2026-11-10T00:00:00.000Z',
            pirze_certificate_claim: '2026-11-15T00:00:00.000Z',
            certificate_cid: 'Qm123...',
            guidebook_cid: 'Qm456...',
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
            prize_winners: [],
          },
        ],
        message: 'Competitions retrieved successfully',
        errors: null,
      },
    },
  })
  async findAll() {
    return this.competitionService.findAll();
  }
}
