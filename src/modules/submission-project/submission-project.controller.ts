import {
  Body,
  Controller,
  Get,
  Param,
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
  type AuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { CreateSubmissionProjectDto } from './dto/create-submission-project.dto.js';
import { SubmissionProjectService } from './submission-project.service.js';

@ApiTags('Submissions')
@Controller('teams')
export class SubmissionProjectController {
  constructor(
    private readonly submissionProjectService: SubmissionProjectService,
  ) {}

  @Get(':teamId/submission')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get project submission for a team',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID (ULID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Project submission retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not a member or leader of the team',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or project submission not found',
  })
  getSubmission(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionProjectService.getSubmission(
      teamId,
      request.userId,
    );
  }

  @Post(':teamId/submission')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit or update a project submission for a team',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID (ULID)',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Project submission created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not a member or leader of the team',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  createSubmission(
    @Param('teamId') teamId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSubmissionProjectDto,
  ) {
    return this.submissionProjectService.createSubmission(
      teamId,
      request.userId,
      dto,
    );
  }
}
