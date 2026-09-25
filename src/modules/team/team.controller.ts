import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthSessionGuard,
  OptionalAuthSessionGuard,
  type AuthenticatedRequest,
  type OptionalAuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { TeamQueryDto } from './dto/team-query.dto.js';
import { TransferLeadershipDto } from './dto/transfer-leadership.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get('public/:slug')
  @ApiOperation({
    summary: 'List public teams for a competition',
  })
  listPublic(@Param('slug') slug: string, @Query() query: TeamQueryDto) {
    return this.teams.listPublic(slug, query);
  }

  @Get(':teamId/competition')
  @UseGuards(OptionalAuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get competition details by Team ID with competition, team, team_role, and team_code relations',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Competition details by team ID retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or competition not found (or private team access restricted)',
  })
  async getCompetitionByTeamId(
    @Param('teamId') teamId: string,
    @Req() request: OptionalAuthenticatedRequest,
  ) {
    return this.teams.getCompetitionByTeamId(teamId, request.userId);
  }

  @Get(':teamId')
  @ApiOperation({
    summary: 'Get team details',
  })
  detail(
    @Param('teamId') teamId: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    return this.teams.detail(teamId, request?.userId);
  }

  @Get(':teamId/members')
  @ApiOperation({
    summary: 'Get team members list',
  })
  members(
    @Param('teamId') teamId: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    return this.teams.members(teamId, request?.userId);
  }

  @Post(':teamId/invites')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate an invite code for team (leader only)',
  })
  createInvite(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.createInvite(teamId, request.userId);
  }

  @Post(':teamId/invites/:inviteId/accept')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept an invite code to join a team',
  })
  acceptInvite(
    @Param('teamId') teamId: string,
    @Param('inviteId') inviteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.acceptInvite(teamId, inviteId, request.userId);
  }

  @Post('invites/:inviteId/accept')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept an invite code by reference code',
  })
  acceptInviteByReference(
    @Param('inviteId') inviteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.acceptInviteByReference(inviteId, request.userId);
  }

  @Post('competition/:slug')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a team for a competition',
  })
  create(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teams.create(slug, request.userId, dto);
  }

  @Post(':teamId/requests')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request to join a public team',
  })
  requestJoin(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.requestJoin(teamId, request.userId);
  }

  @Get(':teamId/requests')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List pending join requests for team (leader only)',
  })
  requests(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.listRequests(teamId, request.userId);
  }

  @Post(':teamId/requests/:requestId/accept')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept a join request (leader only)',
  })
  accept(
    @Param('teamId') teamId: string,
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.decide(teamId, requestId, request.userId, true);
  }

  @Post(':teamId/requests/:requestId/reject')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject a join request (leader only)',
  })
  reject(
    @Param('teamId') teamId: string,
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.decide(teamId, requestId, request.userId, false);
  }

  @Post(':teamId/leave')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Leave a team',
  })
  leaveTeam(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.leaveTeam(teamId, request.userId);
  }

  @Post(':teamId/transfer-leadership')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Transfer team leadership to another member',
  })
  transferLeadership(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: TransferLeadershipDto,
  ) {
    return this.teams.transferLeadership(teamId, request.userId, dto);
  }
}

