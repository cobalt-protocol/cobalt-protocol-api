import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get('competition/:competitionId')
  @ApiOperation({
    summary: 'Get list of public teams (visibility true) by competition ID',
  })
  @ApiParam({
    name: 'competitionId',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
  })
  listPublicByCompetitionId(@Param('competitionId') competitionId: string) {
    return this.teams.listPublicByCompetitionId(competitionId);
  }

  @Get('competition/:competitionId/all')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get list of all teams (both public and private) by competition ID (competition owner only)',
  })
  @ApiParam({
    name: 'competitionId',
    description: 'Competition ID (ULID or on-chain ID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'All teams retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only competition owner can view all teams',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition not found or no teams found',
  })
  listAllByCompetitionId(
    @Param('competitionId') competitionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.listAllByCompetitionId(competitionId, request.userId);
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

  @Get(':teamId/members')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get list of team members by Team ID',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - your join request is still pending or private team access is restricted',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  async getMembers(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.members(teamId, request.userId);
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

  @Patch(':teamId')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update team details / name (leader only)',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only the team leader can update team details',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  update(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teams.update(teamId, request.userId, dto);
  }

  @Post(':teamId/request-join')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit a request to join a team',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Join request submitted successfully',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - already a member or a pending join request already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
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
    summary: 'Get the list of join requests for a team (leader only)',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Join requests retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only the team leader can view join requests',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  listRequestJoins(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.listRequestJoins(teamId, request.userId);
  }

  @Patch(':teamId/requests/:requestId/accept')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept a join request and add the user as a team member (leader only)',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiParam({
    name: 'requestId',
    description: 'Join request ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Join request accepted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - join request already processed or user already a member',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only the team leader can accept join requests',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or join request not found',
  })
  acceptRequestJoin(
    @Param('teamId') teamId: string,
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.acceptRequestJoin(teamId, requestId, request.userId);
  }

  @Patch(':teamId/requests/:requestId/reject')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject a join request (leader only)',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiParam({
    name: 'requestId',
    description: 'Join request ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Join request rejected successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - join request already processed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only the team leader can reject join requests',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or join request not found',
  })
  rejectRequestJoin(
    @Param('teamId') teamId: string,
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.rejectRequestJoin(teamId, requestId, request.userId);
  }
}

