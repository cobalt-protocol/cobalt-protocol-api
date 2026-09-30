import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get('public')
  @ApiOperation({
    summary: 'List all public teams',
  })
  listPublic(@Query() query: TeamQueryDto) {
    return this.teams.listPublic(query);
  }

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

  @Post('competition/:id')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a team for a competition',
  })
  create(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teams.create(id, request.userId, dto);
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

  @Delete(':teamId/members/:memberId')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a member from the team (leader only)',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiParam({
    name: 'memberId',
    description: 'User ID of member to be removed',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Leader cannot remove themselves',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only the team leader can remove members',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or member not found',
  })
  removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.removeMember(teamId, memberId, request.userId);
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

  @Patch(':teamId/name')
  @Put(':teamId/name')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update team name (leader only)',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Team name updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only the team leader can update team name',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  updateName(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teams.update(teamId, request.userId, dto);
  }

  @Patch(':teamId')
  @Put(':teamId')
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
}

