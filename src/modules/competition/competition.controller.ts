import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';
import { CompetitionQueryDto } from './dto/competition-query.dto.js';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitions: CompetitionService) {}
  @Get() list(@Query() query: CompetitionQueryDto) { return this.competitions.list(query); }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.competitions.detail(slug); }
}
