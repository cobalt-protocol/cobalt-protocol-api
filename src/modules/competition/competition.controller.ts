import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';
import { CompetitionQueryDto } from './dto/competition-query.dto.js';
import { CreateCompetitionTeamDto } from '../../competition/dto/create-team.dto.js';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitions: CompetitionService) {}
  @Get()
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'deadline'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 12 })
  list(@Query() query: CompetitionQueryDto) {
    return this.competitions.list(query);
  }

  @Get(':slug') detail(@Param('slug') slug: string) {
    return this.competitions.detail(slug);
  }

  @Post(':id/teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a team for a competition',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Competition ID (ULID, on-chain ID, or slug)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
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
    return this.competitions.createTeam(id, authHeader, dto);
  }
}

