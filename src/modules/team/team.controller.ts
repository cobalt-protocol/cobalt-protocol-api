import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthSessionGuard, type AuthenticatedRequest } from '../../auth/auth-session.guard.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { TeamQueryDto } from './dto/team-query.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Teams')
@Controller()
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get('competitions/:slug/teams')
  list(@Param('slug') slug: string, @Query() query: TeamQueryDto) { return this.teams.listPublic(slug, query); }

  @Post('competitions/:slug/teams') @UseGuards(AuthSessionGuard) @ApiBearerAuth()
  create(@Param('slug') slug: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateTeamDto) {
    return this.teams.create(slug, request.userId, dto);
  }

  @Post('teams/:teamId/requests') @UseGuards(AuthSessionGuard) @ApiBearerAuth()
  requestJoin(@Param('teamId') teamId: string, @Req() request: AuthenticatedRequest) {
    return this.teams.requestJoin(teamId, request.userId);
  }

  @Get('teams/:teamId/requests') @UseGuards(AuthSessionGuard) @ApiBearerAuth()
  requests(@Param('teamId') teamId: string, @Req() request: AuthenticatedRequest) {
    return this.teams.listRequests(teamId, request.userId);
  }

  @Post('teams/:teamId/requests/:requestId/accept') @UseGuards(AuthSessionGuard) @ApiBearerAuth()
  accept(@Param('teamId') teamId: string, @Param('requestId') requestId: string, @Req() request: AuthenticatedRequest) {
    return this.teams.decide(teamId, requestId, request.userId, true);
  }

  @Post('teams/:teamId/requests/:requestId/reject') @UseGuards(AuthSessionGuard) @ApiBearerAuth()
  reject(@Param('teamId') teamId: string, @Param('requestId') requestId: string, @Req() request: AuthenticatedRequest) {
    return this.teams.decide(teamId, requestId, request.userId, false);
  }
}
