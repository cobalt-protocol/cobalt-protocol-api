import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthSessionGuard, type AuthenticatedRequest } from '../../auth/auth-session.guard.js';
import { CertificateService } from './certificate.service.js';
import { CertificateQueryDto } from './dto/certificate-query.dto.js';

@ApiTags('Certificates')
@Controller('users/me/certificates')
@UseGuards(AuthSessionGuard)
@ApiBearerAuth()
export class CertificateController {
  constructor(private readonly certificates: CertificateService) {}

  @Get('team/:teamId/participant-minted')
  @ApiOperation({
    summary: 'Get participant minted certificates by team ID (team-scoped)',
    description:
      'GET api/v1/users/me/certificates/team/:teamId/participant-minted — returns rows from certificate_participant_minted filtered by team_id. Enforces team membership (team.user_id = sub OR team_role.user_id = sub). Supports pagination and filters: page, limit, competitionId, chainId, search(uri). 404 when no rows for this team/user.',
  })
  @ApiParam({ name: 'teamId', description: 'Team ID (ULID, FK certificate_participant_minted.team_id)', type: String, required: true })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid team ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a team member' })
  @ApiResponse({ status: 404, description: 'Team not found or no certificates for this team' })
  async findByTeam(
    @Param('teamId') teamId: string,
    @Query() query: CertificateQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificates.findMyParticipantMintedByTeam(req.userId, teamId, query);
  }

  @Get('participant-minted')
  @ApiOperation({
    summary: 'Get all participant minted certificates for current user (all teams, deprecated)',
    description:
      'GET api/v1/users/me/certificates/participant-minted — legacy alias that aggregates all teams where user is owner/member. Prefer team-scoped endpoint above.',
  })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No certificates found' })
  async findAll(
    @Query() query: CertificateQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificates.findMyParticipantMintedAll(req.userId, query);
  }
}
