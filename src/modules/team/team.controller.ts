import {
  Body,
  Controller,
  Delete,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { TeamQueryDto } from './dto/team-query.dto.js';
import { TransferLeadershipDto } from './dto/transfer-leadership.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Teams')
@Controller()
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get('competitions/:slug/teams')
  @ApiOperation({ summary: 'List public teams for a competition' })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  list(@Param('slug') slug: string, @Query() query: TeamQueryDto) {
    return this.teams.listPublic(slug, query);
  }

  @Get('teams/:teamId')
  @ApiOperation({ summary: 'Get team detail' })
  detail(
    @Param('teamId') teamId: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    return this.teams.detail(teamId, request?.userId);
  }

  @Get('teams/:teamId/members')
  @ApiOperation({ summary: 'List team members' })
  members(
    @Param('teamId') teamId: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    return this.teams.members(teamId, request?.userId);
  }

  @Post('competitions/:slug/teams')
  @ApiOperation({ summary: 'Create a team in a competition' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  create(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teams.create(slug, request.userId, dto);
  }

  @Post('teams/:teamId/requests')
  @ApiOperation({ summary: 'Request to join a public team' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  requestJoin(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.requestJoin(teamId, request.userId);
  }

  @Get('teams/:teamId/requests')
  @ApiOperation({ summary: 'List pending request joiners for a team' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  requests(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.listRequests(teamId, request.userId);
  }

  @Post('teams/:teamId/requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a team join request' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  accept(
    @Param('teamId') teamId: string,
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.decide(teamId, requestId, request.userId, true);
  }

  @Post('teams/:teamId/requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a team join request' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  reject(
    @Param('teamId') teamId: string,
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.decide(teamId, requestId, request.userId, false);
  }

  @Delete('teams/:teamId/members/me')
  @ApiOperation({ summary: 'Leave a team' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  leaveTeam(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.teams.leaveTeam(teamId, request.userId);
  }

  @Post('teams/:teamId/leadership/transfer')
  @ApiOperation({ summary: 'Transfer team leadership' })
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  transferLeadership(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: TransferLeadershipDto,
  ) {
    return this.teams.transferLeadership(teamId, request.userId, dto);
  }
}
