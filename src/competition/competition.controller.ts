import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
            tx_hash:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
    summary:
      'Get list of competitions owned by the authenticated organization user',
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
            tx_hash:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
    summary: 'Get list of all listing tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing tokens retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '01J8Z9X0000000000000000001',
            tx_hash:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            listing_token_id: '1',
            token_address: '0x1234567890123456789012345678901234567890',
            is_active: true,
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
          },
        ],
        message: 'Listing tokens retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No listing tokens found',
    schema: {
      example: {
        data: null,
        message: 'No listing tokens found',
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

  @Get(':id/signature-certificate-participant/:teamId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get signature certificate participant record by competition ID and team ID for the authenticated user (live re-signed, with IPFS metadata CID)',
    description:
      'Requires competition ID (ULID or on-chain) and team ID. Validates that the team belongs to the competition, that the authenticated user is a member of the team, and that the team has a non-empty submission_project (400 if empty). Collects submission_project (title→title_project, description→description_project, submission_link, document_cid) + competition (name→title, description, certificate_cid→image as ipfs://<cid>) into a JSON, pins that JSON to Kubo IPFS (/api/v0/add) to obtain a metadata CID, then live re-signs hash keccak256(abi.encodePacked(address(this), msg.sender, competitionId, teamId, metadataCid)) which must match CompetitionManager.safeMintCertificateParticipant on-chain verification. Returns signature + cid/uri/metadata for frontend safeMintCertificateParticipant.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID (ULID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description:
      'Signature certificate participant retrieved successfully (includes IPFS metadata CID for on-chain minting)',
    schema: {
      example: {
        data: {
          id: '01J8Z9X0000000000000000001',
          signature:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b',
          cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
          certificate_cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
          uri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
          metadata: {
            title_project: 'My Awesome Project',
            description_project: 'Project description from submission_project',
            submission_link: 'https://github.com/org/repo',
            document_cid: 'QmDocumentCid123',
            document_uri: 'ipfs://QmDocumentCid123',
            title: 'Cobalt Hackathon 2026',
            description: 'Building decentralized AI applications',
            image: 'ipfs://QmCertificateCid123',
            certificate_cid: 'QmCertificateCid123',
          },
          user_id: '01J8Z9X0000000000000000002',
          competition_id: '01J8Z9X0000000000000000001',
          team_id: '01J8Z9X0000000000000000001',
          created_at: '2026-09-24T00:00:00.000Z',
          updated_at: null,
          deleted_at: null,
        },
        message: 'Signature certificate participant retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Team has not submitted any project (submission_project is empty) or IPFS pin failed',
    schema: {
      example: {
        data: null,
        message: 'Team has not submitted any project yet (submission_project is empty) — cannot generate participant certificate signature',
        errors: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not a member of the specified team',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or team not found',
  })
  async findSignatureCertificateParticipant(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.competitionService.findSignatureCertificateParticipant(
      id,
      teamId,
      authHeader,
    );
  }

  @Get(':id/signature-certificate-winner/:winnerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signature certificate winner record (live re-signed) by competition ID and winner ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Competition ID (ULID or on-chain ID)', type: String, example: '01J8Z9X0000000000000000001' })
  @ApiParam({ name: 'winnerId', description: 'Winner ID — ULID or on-chain numeric winner_id', type: String, example: '1' })
  @ApiResponse({ status: 200, description: 'Signature certificate winner retrieved successfully', schema: { example: { data: { id: '01J8Z9X0000000000000000001', signature: '0x1234...1b', user_id: '01J8Z9X0000000000000000002', competition_id: '01J8Z9X0000000000000000001', winner_id: '1', uri: 'ipfs://QmWinner123', created_at: '2026-09-24T00:00:00.000Z', updated_at: null, deleted_at: null }, message: 'Signature certificate winner retrieved successfully', errors: null } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid Bearer token' })
  @ApiResponse({ status: 404, description: 'Competition, team, or winner not found' })
  async findSignatureCertificateWinnerById(
    @Param('id') id: string,
    @Param('winnerId') winnerId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.competitionService.findSignatureCertificateWinner(id, winnerId, authHeader);
  }

  @Get(':id/signature-certificate-winner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signature certificate winner record (live re-signed) by competition ID for the authenticated winner' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Competition ID (ULID or on-chain ID)', type: String, example: '01J8Z9X0000000000000000001' })
  @ApiResponse({ status: 200, description: 'Signature certificate winner retrieved successfully', schema: { example: { data: { id: '01J8Z9X0000000000000000001', signature: '0x1234...1b', user_id: '01J8Z9X0000000000000000002', competition_id: '01J8Z9X0000000000000000001', winner_id: '1', uri: 'ipfs://QmWinner123', created_at: '2026-09-24T00:00:00.000Z', updated_at: null, deleted_at: null }, message: 'Signature certificate winner retrieved successfully', errors: null } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid Bearer token' })
  @ApiResponse({ status: 404, description: 'Competition, team, or winner not found' })
  async findSignatureCertificateWinner(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.competitionService.findSignatureCertificateWinner(id, undefined, authHeader);
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
          tx_hash:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
