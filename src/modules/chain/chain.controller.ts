import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainService } from './chain.service.js';
import {
  AuthSessionGuard,
  OptionalAuthSessionGuard,
} from '../../auth/auth-session.guard.js';
import type {
  AuthenticatedRequest,
  OptionalAuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { CreateCompetitionTeamDto } from '../../competition/dto/create-team.dto.js';
import { UpdateChainTeamDto } from './dto/update-chain-team.dto.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { JoinTeamByCodeDto } from './dto/join-team-by-code.dto.js';


@ApiTags('Chains')
@Controller('chains')
export class ChainController {
  constructor(private readonly chainService: ChainService) { }

  @Get(':chain_id/competitions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all competitions by chain ID',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Competitions retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No competitions found for the specified chain ID',
  })
  async getCompetitionsByChainId(
    @Param('chain_id', ParseIntPipe) chainId: number,
  ) {
    return this.chainService.getCompetitionsByChainId(chainId);
  }

  @Get(':chain_id/competitions/organization')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get organization competitions by chain ID (owner only)',
    description:
      'GET api/v1/chains/:chain_id/competitions/organization — protected by Bearer JWT (AuthSessionGuard). Returns rows from table `competition` where `user_id = JWT sub` (owner) AND `deleted_at IS NULL` AND `indexer_state.chain_id = :chain_id`. Only competitions owned by the authenticated organization user on the specified chain are returned. Throws 401 if unauthorized, 404 if no data.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization competitions retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 404,
    description: 'No organization competitions found for the specified chain',
  })
  async getOrganizationCompetitionsByChainId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getOrganizationCompetitionsByChainId(
      chainId,
      req.userId,
    );
  }

  @Get(':chain_id/competitions/listing-token-prize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all listing token prizes by chain ID',
    description:
      'Retrieve all active listing tokens from the listing_token table filtered by chain_id via indexer_state.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (matched via listing_token.indexer_state.chain_id)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Listing tokens retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No listing tokens found for the specified chain',
  })
  async getListingTokenPrizesByChainId(
    @Param('chain_id', ParseIntPipe) chainId: number,
  ) {
    return this.chainService.getListingTokenPrizesByChainId(chainId);
  }

  @Get(':chain_id/price-competitions/:price_competition_fee_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get price competition by chain ID and price competition fee ID',
    description:
      'Retrieve a price competition from the price_competition table filtered by chain_id (via indexer_state) and price_competition_fee_id.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (matched via price_competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiParam({
    name: 'price_competition_fee_id',
    required: true,
    description: 'Price competition fee ID (or ULID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Price competition retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Price competition not found for the specified chain and fee ID',
  })
  async getPriceCompetitionByChainIdAndFeeId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('price_competition_fee_id') priceCompetitionFeeId: string,
  ) {
    return this.chainService.getPriceCompetitionByChainIdAndFeeId(
      chainId,
      priceCompetitionFeeId,
    );
  }

  @Get(':chain_id/competitions/:competition_id/teams/organization')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get organization teams by chain ID and competition ID (owner only)',
    description:
      'GET api/v1/chains/:chain_id/competitions/:competition_id/teams/organization — protected by Bearer JWT (AuthSessionGuard). Returns rows from table `team` where `competition_id = :competition_id` AND `competition.user_id = JWT sub` (owner) AND `team.deleted_at IS NULL` AND `competition.deleted_at IS NULL` AND `competition.indexer_state.chain_id = :chain_id`. Only the owner of the competition can access. Supports both ULID `competition.id` and on-chain `competition.competition_id` via OR filter. Throws 401 if unauthorized, 403 if not owner, 404 if competition not found on chain.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (matched via competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiParam({
    name: 'competition_id',
    required: true,
    description: 'Competition ID (ULID or on-chain competition_id)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization teams retrieved successfully (may be empty array if no teams yet)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing Bearer token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only competition owner can access',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found on chain',
  })
  async getOrganizationTeamsByChainIdAndCompetitionId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getOrganizationTeamsByChainIdAndCompetitionId(
      chainId,
      competitionId,
      req.userId,
    );
  }


  @Get(':chain_id/competitions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific competition by chain ID and competition ID',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Competition ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Competition retrieved successfully with included organization data',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found',
  })
  async getCompetitionByChainIdAndId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('id') id: string,
  ) {
    return this.chainService.getCompetitionByChainIdAndId(chainId, id);
  }

  @Get(':chain_id/competitions/:id/prize-winners')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get prize winners by chain ID and competition ID',
    description:
      'GET api/v1/chains/:chain_id/competitions/:id/prize-winners — returns rows from table `prize_winner` where `competition_id = :id` (supports ULID `competition.id` or on-chain `competition.competition_id`) AND `deleted_at IS NULL` AND `competition.indexer_state.chain_id = :chain_id`. Validates that the competition exists on the given chain (404 if not). Returns prize_winner[] with included `winner -> user` (id, wallet_address, username, email, location, institution). Ordered by winner_id ASC. Returns empty array if competition has no prize winners yet (200, not 404). BigInt fields (winner_id, amount) are serialized as strings via BigInt.toJSON.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (matched via competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Competition ID (ULID or on-chain competition_id)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Prize winners retrieved successfully (data = PrizeWinner[]; empty array if none yet)',
    schema: {
      example: {
        data: [
          {
            id: '01J8Z9X0000000000000000002',
            winner_id: '1',
            category: '1st Place',
            amount: '1000000000000000000',
            certificate_cid: 'bafy...',
            competition_id: '01J8Z9X0000000000000000001',
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
            winner: {
              id: '01J8Z9X0000000000000000003',
              wallet_address: '0x1234...',
              user_id: '01J8Z9X0000000000000000004',
              prize_winner_id: '01J8Z9X0000000000000000002',
              user: {
                id: '01J8Z9X0000000000000000004',
                wallet_address: '0x1234...',
                username: 'alice',
                email: 'alice@example.com',
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
    description: 'Competition not found on chain',
    schema: {
      example: {
        data: null,
        message: 'Competition with ID <id> not found on chain ID <chainId>',
        errors: null,
      },
    },
  })
  async getPrizeWinnersByChainIdAndCompetitionId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('id') id: string,
  ) {
    return this.chainService.getPrizeWinnersByChainIdAndCompetitionId(chainId, id);
  }

  @Get(':chain_id/competitions/:id/prize-distributed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get prize distributed by chain ID and competition ID',
    description:
      'GET api/v1/chains/:chain_id/competitions/:id/prize-distributed — returns rows from table `prize_distributed` where `competition_id` matches the competition (ULID `competition.id` or on-chain `competition.competition_id`) on the given chain. Returns 404 if the competition or its prize_distributed data is not found.',
  })
  @ApiParam({ name: 'chain_id', required: true, description: 'Chain ID', type: Number })
  @ApiParam({ name: 'id', required: true, description: 'Competition ID (ULID or on-chain competition_id)', type: String })
  @ApiResponse({ status: 200, description: 'Prize distributed retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Competition or prize distributed data not found' })
  async getPrizeDistributedByChainIdAndCompetitionId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('id') id: string,
  ) {
    return this.chainService.getPrizeDistributedByChainIdAndCompetitionId(chainId, id);
  }

  @Get(':chain_id/competitions/:id/participant-winners')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get participant winners by chain ID and competition ID',
    description:
      'GET api/v1/chains/:chain_id/competitions/:id/participant-winners — returns rows from table `participant_winner` where `competition_id = :id` (supports ULID `competition.id` or on-chain `competition.competition_id`) AND `deleted_at IS NULL` AND `competition.indexer_state.chain_id = :chain_id`. Includes user profile, prize_winner details, and team info. Returns empty array if none yet.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (matched via competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Competition ID (ULID or on-chain competition_id)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Participant winners retrieved successfully (data = ParticipantWinner[]; empty array if none yet)',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found on chain',
  })
  async getParticipantWinnersByChainIdAndCompetitionId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('id') id: string,
  ) {
    return this.chainService.getParticipantWinnersByChainIdAndCompetitionId(chainId, id);
  }

  @Post(':chain_id/competitions/:competition_id/join-teams')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a team for a specific competition on a chain',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiParam({
    name: 'competition_id',
    required: true,
    description: 'Competition ID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid session',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or user not found',
  })
  async createTeam(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCompetitionTeamDto,
  ) {
    return this.chainService.createTeam(req.userId, chainId, competitionId, dto);
  }
  @Get(':chain_id/teams')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all user teams by chain ID (team_role=accepted UNION request_join=pending)',
    description:
      'Source: `team_role` (status=\'accepted\') UNION `request_join` (status=row.status, default pending) untuk JWT sub. team_role.user_id -> team -> competition -> indexer_state.chain_id dan request_join.user_id -> team -> competition -> indexer_state.chain_id. Dedup: jika team sudah ada di team_role, baris request_join untuk team itu diabaikan. Setiap item memiliki field `status`: `accepted` jika dari team_role, nilai kolom `request_join.status` (biasanya pending) jika dari request_join, plus `source` penanda. Soft-delete aware (deleted_at IS NULL). Setiap team.competition menyertakan prize_deposits BigInt->string.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (dicocokkan via competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'User teams retrieved successfully (data = TeamRole[] + include team.competition, skills_team, requirements_team, team_codes, team_roles->user, request_joins, submission_project)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid session',
  })
  async getUserTeamsByChainId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getUserTeamsByChainId(req.userId, chainId);
  }

  @Get(':chain_id/competitions/:competition_id/join-teams')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get public joinable teams by chain ID and competition ID',
    description:
      'Mengambil semua data team dari tabel `team` yang visibility=true (public) dan deleted_at IS NULL, ter-filter berdasarkan competition_id dan chain_id (via competition.indexer_state.chain_id). Dilindungi Authentication header (Bearer JWT). Akan SKIP team jika authenticated user sudah ada di table `request_join` (user_id = JWT sub) atau table `team_role` (user_id = JWT sub) untuk team tersebut. Include: skills_team, requirements_team, team_codes, team_roles->user, request_joins->user, submission_project, user (owner), competition (+indexer_state, prize_winners, prize_deposits). Endpoint ini dipakai oleh web join-team page (apps/web/features/teams/components/join-team-page.tsx).',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (dicocokkan via competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiParam({
    name: 'competition_id',
    required: true,
    description: 'Competition ID (ULID atau competition_id on-chain)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Public teams retrieved successfully (data = Team[] ter-filter visibility=true, chain_id, competition_id, skip existing membership/request)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition with ID not found on chain ID atau user not found',
  })
  async getPublicTeamsByChainIdAndCompetitionId(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getPublicTeamsByChainIdAndCompetitionId(
      req.userId,
      chainId,
      competitionId,
    );
  }

  // Alias lama untuk backward compatibility: GET .../teams/public -> redirect ke join-teams
  @Get(':chain_id/competitions/:competition_id/teams/public')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEPRECATED] Alias for GET join-teams - use /join-teams instead' })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'competition_id', required: true, type: String })
  async getPublicTeamsAlias(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getPublicTeamsByChainIdAndCompetitionId(
      req.userId,
      chainId,
      competitionId,
    );
  }

  /**
   * POST api/v1/chains/:chain_id/teams/:competition_id/request-join
   * Spec: api/v1/chains/<chain_id>/teams/<competition_id>/request-join
   * - Segmen :competition_id di URL secara semantik adalah Team.id (PK tabel team).
   *   Dinamai competition_id agar path literal 100% sesuai spec yang diminta user.
   * - Protected: Authorization: Bearer <JWT> (AuthSessionGuard -> req.userId = JWT sub)
   * - Validasi: team.deleted_at IS NULL + team.competition.indexer_state.chain_id = :chain_id
   * - Idempotent guard: 409 jika user sudah jadi member (team_role) atau sudah request (request_join)
   * - Effect: INSERT INTO request_join (user_id, team_id, status='pending') — status varchar pending
   */
  @Post(':chain_id/teams/:competition_id/request-join')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request to join a team (insert request_join status=pending)',
    description:
      'Protected by Authorization: Bearer JWT. Validasi team belongs to chain via team.competition.indexer_state.chain_id = :chain_id dan team.deleted_at IS NULL. Guard 409 jika user sudah ada di team_role atau sudah punya request_join aktif untuk team itu. Insert ke table `request_join` (@@map \"request_join\") dengan status=\'pending\' (kolom status String @db.VarChar). Full path sesuai spec: POST /api/v1/chains/:chain_id/teams/:competition_id/request-join — segmen :competition_id menampung Team.id.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID (dicocokkan via team.competition.indexer_state.chain_id)',
    type: Number,
  })
  @ApiParam({
    name: 'competition_id',
    required: true,
    description: 'Team ID (PK tabel team; nama param competition_id agar path literal sesuai spec)',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Request to join created — data = RequestJoin { id, user_id, team_id, status=pending }',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid Bearer token' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden — user profile incomplete (username, email, location, institution, skills, skill_description)',
  })
  @ApiResponse({ status: 404, description: 'User not found atau Team not found on chain' })
  @ApiResponse({ status: 409, description: 'Already a member or already requested to join' })
  async requestJoinTeam(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.requestJoinTeam(req.userId, chainId, competitionId);
  }

  /**
   * POST api/v1/chains/:chain_id/competitions/:competition_id/join-by-code
   * Join a team instantly using a team code (value from the `team_code` table).
   * Protected: Authentication header (Bearer JWT).
   * Payload: { "team_code": "COBALT-ABC12" }.
   * Validasi: competition (id/competition_id) + indexer_state.chain_id = :chain_id,
   * team_code valid & belum di-soft-delete, team milik competition, kapasitas team
   * dari competition.formation (mis. "1-3" atau "1-5") belum penuh, dan user belum
   * menjadi member. Sukses => INSERT team_role (role='MEMBER').
   */
  @Post(':chain_id/competitions/:competition_id/join-by-code')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Join a team by team code (chain-scoped)',
    description:
      'Join a team instantly using a team code from the `team_code` table. Validates the competition (id or competition_id) under the given chain, checks that the code maps to a team in that competition, verifies the team is not full based on `competition.formation` capacity (e.g. "1-3" or "1-5"), and rejects duplicate membership. On success, inserts a `team_role` row with role = MEMBER and returns the joined team info.',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'competition_id', required: true, type: String })
  @ApiResponse({
    status: 201,
    description:
      'Joined team successfully (data = { team_id, team_name, role, max_team_size, member_count })',
  })
  @ApiResponse({
    status: 400,
    description: 'Team code does not belong to this competition',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'User/Competition not found, or invalid team code',
  })
  @ApiResponse({
    status: 409,
    description: 'Already a member of this team, or the team is full',
  })
  async joinTeamByCode(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: JoinTeamByCodeDto,
  ) {
    return this.chainService.joinTeamByCode(
      req.userId,
      chainId,
      competitionId,
      dto,
    );
  }

  /**
   * GET api/v1/chains/:chain_id/teams/:team_id/members
   * Chain-scoped members listing. Validasi team.competition.indexer_state.chain_id == :chain_id.
   * FE: fetchTeamMembersResult(chainId, teamId) -> GET /chains/:chainId/teams/:teamId/members
   * Auth: required. Competition owner bypass, else member/pending checks like TeamService.members.
   */
  @Get(':chain_id/teams/:team_id/members')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team members by chain ID and team ID (chain-scoped)' })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Team members retrieved — { data: TeamRole[] }' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — pending request' })
  @ApiResponse({ status: 404, description: 'Team not found on chain' })
  async getTeamMembers(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getTeamMembers(chainId, teamId, req.userId);
  }

  @Get(':chain_id/teams/:team_id/submission')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team submission by chain ID and team ID' })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  async getTeamSubmission(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getTeamSubmission(chainId, teamId, req.userId);
  }

  @Post(':chain_id/teams/:team_id/submission')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create/update team submission (leader/member)' })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  async createTeamSubmission(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.chainService.createTeamSubmission(chainId, teamId, req.userId, dto);
  }

  /**
   * GET api/v1/chains/:chain_id/teams/:team_id
   * Detail team chain-scoped. Validasi team.competition.indexer_state.chain_id == :chain_id.
   * FE: fetchTeamDetail(chainId, teamId) / fetchTeamCompetitionDetailResult -> GET /chains/:chainId/teams/:teamId
   * Optional auth: public team 200 tanpa token, private team 403 jika bukan member.
   */
  @Get(':chain_id/teams/:team_id')
  @UseGuards(OptionalAuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team detail by chain ID and team ID (chain-scoped)' })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Team detail — { data: Team }' })
  @ApiResponse({ status: 404, description: 'Team not found on chain' })
  async getTeamDetail(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Req() req: OptionalAuthenticatedRequest,
  ) {
    return this.chainService.getTeamDetail(chainId, teamId, req.userId);
  }

  @Patch(':chain_id/teams/:team_id')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update team (leader only, chain-scoped)' })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  async updateTeam(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateChainTeamDto,
  ) {
    return this.chainService.updateTeam(chainId, teamId, req.userId, dto);
  }

  /**
   * GET api/v1/chains/:chain_id/teams/:team_id/requests
   * Spec diminta: filter request_join by team_id + owner check team.user_id == JWT sub
   * Validasi chain via team.competition.indexer_state.chain_id === :chain_id
   * FE sinkron: fetchTeamJoinRequestsResult(chainId, teamId) -> GET /chains/:chainId/teams/:teamId/requests
   * Include user.skill_description / social_media / skills agar FE bisa render pitch & badges.
   */
  @Get(':chain_id/teams/:team_id/requests')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get join requests for a team (team leader only, chain-scoped)',
    description:
      'Mengambil data dari table `request_join` filter by team_id (`team_id = :team_id`, deleted_at IS NULL) dan filter owner: `team.user_id == JWT sub` (dari Authorization: Bearer token). Validasi chain: `team.competition.indexer_state.chain_id == :chain_id`. Include user relation (username, wallet_address, institution, location, skill_description, social_media, skills) agar FE IncomingJoinRequests bisa render. Sinkron dengan FE: fetchTeamJoinRequestsResult -> GET /chains/:chainId/teams/:teamId/requests. 401 jika token invalid, 403 jika bukan leader, 404 jika team tidak ada di chain.',
  })
  @ApiParam({ name: 'chain_id', required: true, description: 'Chain ID (dicocokkan via team.competition.indexer_state.chain_id)', type: Number })
  @ApiParam({ name: 'team_id', required: true, description: 'Team ID (PK tabel team)', type: String })
  @ApiResponse({ status: 200, description: 'Join requests retrieved — { data: RequestJoin[] (+user), message, errors }' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid Bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden — only team leader can view requests (team.user_id != JWT sub)' })
  @ApiResponse({ status: 404, description: 'Team not found on chain' })
  async getTeamJoinRequests(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.getTeamJoinRequests(req.userId, chainId, teamId);
  }

  /**
   * PATCH api/v1/chains/:chain_id/teams/:team_id/requests/:request_id/accept
   * Sinkron FE: acceptTeamJoinRequest(chainId, teamId, requestId) -> PATCH .../requests/:requestId/accept
   * Leader only + chain validation + transaction (request_join status=accepted + team_role MEMBER)
   */
  @Patch(':chain_id/teams/:team_id/requests/:request_id/accept')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept a join request (leader only, chain-scoped)',
    description:
      'PATCH /chains/:chainId/teams/:teamId/requests/:requestId/accept — hanya team leader (team.user_id == JWT sub) yang boleh. Validasi chain_id via competition.indexer_state.chain_id. Guard 400 jika request bukan pending atau user sudah member. Effect: $transaction update request_join.status=accepted + insert team_role role=MEMBER.',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  @ApiParam({ name: 'request_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Join request accepted — { data: { request, role }, message, errors }' })
  @ApiResponse({ status: 400, description: 'Already processed or already a member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — only leader can accept' })
  @ApiResponse({ status: 404, description: 'Team or request not found on chain' })
  async acceptTeamJoinRequest(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Param('request_id') requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.acceptTeamJoinRequest(req.userId, chainId, teamId, requestId);
  }

  /**
   * PATCH api/v1/chains/:chain_id/teams/:team_id/requests/:request_id/reject
   * Sinkron FE: rejectTeamJoinRequest(chainId, teamId, requestId) -> PATCH .../requests/:requestId/reject
   */
  @Patch(':chain_id/teams/:team_id/requests/:request_id/reject')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject a join request (leader only, chain-scoped)',
    description:
      'PATCH /chains/:chainId/teams/:teamId/requests/:requestId/reject — hanya team leader (team.user_id == JWT sub). Validasi chain_id via team.competition.indexer_state.chain_id. Update request_join.status=rejected.',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'team_id', required: true, type: String })
  @ApiParam({ name: 'request_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Join request rejected' })
  @ApiResponse({ status: 400, description: 'Already processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — only leader' })
  @ApiResponse({ status: 404, description: 'Team or request not found on chain' })
  async rejectTeamJoinRequest(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('team_id') teamId: string,
    @Param('request_id') requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.rejectTeamJoinRequest(req.userId, chainId, teamId, requestId);
  }

  @Post(':chain_id/competitions/:competition_id/signature-certificate-participant/:team_id')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate participant certificate signature (chain-scoped, persisted)',
    description:
      'POST api/v1/chains/:chain_id/competitions/:competition_id/signature-certificate-participant/:team_id — hash 1:1 dengan cobalt-protocol-smart-contract/scripts/competitions/claim_certificate_participant.py HARDCODED_CID (raw tanpa ipfs://): keccak256(abi.encodePacked(address(this), msg.sender, _competitionId, _teamId, _cid)). _cid dire-derive ke uri via IPFSHelper.toIPFSURI(_cid). Validates chain via competition.indexer_state.chain_id, caller team membership, and non-empty submission_project (400 if empty). Response cid/uri/signature langsung dipakai untuk CompetitionManager.safeMintCertificateParticipant(compId, teamId, signature, cid). CID di-hardcode di API (fallback bafy...zdi) dan override via env PARTICIPANT_CERTIFICATE_CID — harus 1:1 dengan HARDCODED_CID di script claim.',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'competition_id', required: true, type: String })
  @ApiParam({ name: 'team_id', required: true, type: String })
  @ApiResponse({ status: 201, description: 'Signature generated and persisted' })
  @ApiResponse({ status: 400, description: 'Bad Request — no submission or competition not indexed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a team member' })
  @ApiResponse({ status: 404, description: 'Competition or team not found on chain' })
  async generateSignatureCertificateParticipant(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.generateSignatureCertificateParticipant(chainId, competitionId, teamId, req.userId);
  }

  @Get(':chain_id/competitions/:competition_id/signature-certificate-participant/:team_id')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get participant certificate signature (chain-scoped, idempotent)',
    description:
      'GET alias for POST api/v1/chains/:chain_id/.../signature-certificate-participant/:team_id — same hardcoded CID hash (claim_certificate_participant.py HARDCODED_CID) & upsert logic.',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'competition_id', required: true, type: String })
  @ApiParam({ name: 'team_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Signature retrieved/generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Competition or team not found on chain' })
  async getSignatureCertificateParticipant(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Param('team_id') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.generateSignatureCertificateParticipant(chainId, competitionId, teamId, req.userId);
  }

  @Get(':chain_id/competitions/:competition_id/certificate-participant-winner-minted')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get winner minted certificates for authenticated user by chain and competition ID',
    description:
      'GET api/v1/chains/:chain_id/competitions/:competition_id/certificate-participant-winner-minted — returns rows from table `certificate_participant_winner_minted` filtered by user_id and competition_id on the specified chain.',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number })
  @ApiParam({ name: 'competition_id', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Winner minted certificates retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Competition not found on this chain',
  })
  async getCertificateParticipantWinnerMinted(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chainService.findMyWinnerMinted(
      req.userId,
      chainId,
      competitionId,
    );
  }
}

