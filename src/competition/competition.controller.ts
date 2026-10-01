import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';
import { CreateCompetitionTeamDto } from './dto/create-team.dto.js';

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
  @ApiResponse({
    status: 404,
    description: 'No competitions found',
    schema: {
      example: {
        data: null,
        message: 'No competitions found',
        errors: null,
      },
    },
  })
  async findAll(@Headers('authorization') authHeader?: string) {
    return this.competitionService.findAll(authHeader);
  }

  @Get('organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get list of competitions owned by the authenticated organization user',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Organization competitions retrieved successfully',
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
        message: 'Organization competitions retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 404,
    description: 'No organization competitions found',
    schema: {
      example: {
        data: null,
        message: 'No organization competitions found',
        errors: null,
      },
    },
  })
  async findOrganizationCompetitions(
    @Headers('authorization') authHeader: string,
  ) {
    return this.competitionService.findOrganizationCompetitions(authHeader);
  }

  @Get('listing-token-prize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get list of all listing token prizes',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing token prizes retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '01J8Z9X0000000000000000001',
            tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            listing_token_prize_id: '1',
            token_address: '0x1234567890123456789012345678901234567890',
            is_active: true,
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
          },
        ],
        message: 'Listing token prizes retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No listing token prizes found',
    schema: {
      example: {
        data: null,
        message: 'No listing token prizes found',
        errors: null,
      },
    },
  })
  async findListingTokenPrizes() {
    return this.competitionService.findListingTokenPrizes();
  }

  @Get(':id/my-team')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get user team for a specific competition by competition ID or on-chain ID',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description:
      'Team retrieved successfully or null if user has no team in this competition',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found',
  })
  async findMyTeamByCompetitionId(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.competitionService.findMyTeamByCompetitionId(id, authHeader);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get competition by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Competition ID',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Competition retrieved successfully',
    schema: {
      example: {
        data: {
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
        message: 'Competition retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found',
    schema: {
      example: {
        data: null,
        message: 'Competition not found',
        errors: null,
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.competitionService.findOne(id);
  }

  @Get(':id/token-prize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get token prize and total prize amount by competition ID',
  })
  @ApiParam({
    name: 'id',
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
    schema: {
      example: {
        data: null,
        message: 'Competition not found',
        errors: null,
      },
    },
  })
  async getTokenPrizeByCompetitionId(@Param('id') id: string) {
    return this.competitionService.getTokenPrizeByCompetitionId(id);
  }

  @Post(':id/teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a team for a competition',
    description:
      'Creates a team for the authenticated user. An invite code (team_code) is only generated for private teams (visibility: false). Public teams (visibility: true) can be joined directly and therefore do not receive a team_code.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 201,
    description:
      'Team created successfully. team_code is only returned for private teams (visibility: false).',
    schema: {
      example: {
        data: {
          id: '01J8Z9X0000000000000000005',
          name: 'Cyber Warriors',
          visibility: false,
          description: 'Building decentralized AI applications',
          competition_id: '01J8Z9X0000000000000000001',
          user_id: '01J8Z9X0000000000000000004',
          team_code: 'COBALT-A1B2C3D4E5',
          team_codes: [
            {
              id: '01J8Z9X0000000000000000006',
              code: 'COBALT-A1B2C3D4E5',
              team_id: '01J8Z9X0000000000000000005',
              created_at: '2026-09-24T00:00:00.000Z',
              updated_at: null,
              deleted_at: null,
            },
          ],
          skills_team: [
            {
              id: '01J8Z9X0000000000000000007',
              name: 'Frontend Developer',
              team_id: '01J8Z9X0000000000000000005',
              created_at: '2026-09-24T00:00:00.000Z',
              updated_at: null,
              deleted_at: null,
            },
          ],
          requirements_team: {
            id: '01J8Z9X0000000000000000009',
            requirement: 'Building decentralized AI applications',
            team_id: '01J8Z9X0000000000000000005',
            created_at: '2026-09-24T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
          },
          created_at: '2026-09-24T00:00:00.000Z',
          updated_at: null,
        },
        message: 'Team created successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found',
  })
  async createTeam(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateCompetitionTeamDto,
  ) {
    return this.competitionService.createTeam(id, authHeader, dto);
  }
}
