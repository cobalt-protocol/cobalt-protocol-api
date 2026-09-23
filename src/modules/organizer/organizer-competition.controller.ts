import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { CreateOrganizerCompetitionDto } from './dto/create-organizer-competition.dto.js';
import { OrganizerCompetitionQueryDto } from './dto/organizer-competition-query.dto.js';
import { UpdateOrganizerCompetitionDto } from './dto/update-organizer-competition.dto.js';
import { OrganizerCompetitionService } from './organizer-competition.service.js';

@ApiTags('Organizer competitions')
@ApiBearerAuth()
@UseGuards(AuthSessionGuard)
@Controller('organizer/competitions')
export class OrganizerCompetitionController {
  constructor(private readonly competitions: OrganizerCompetitionService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organizer-owned competition draft' })
  @ApiCreatedResponse({ description: 'Competition draft created' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrganizerCompetitionDto,
  ) {
    return this.competitions.create(request.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List competitions owned by the organizer' })
  @ApiOkResponse({ description: 'Organizer competition page' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'PUBLISHED'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    default: 1,
    minimum: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: OrganizerCompetitionQueryDto,
  ) {
    return this.competitions.list(request.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organizer-owned competition' })
  detail(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.competitions.detail(request.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organizer-owned draft competition' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizerCompetitionDto,
  ) {
    return this.competitions.update(request.userId, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Validate and publish a competition draft' })
  publish(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.competitions.publish(request.userId, id);
  }
}
