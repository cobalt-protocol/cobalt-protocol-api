import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';
import { CompetitionQueryDto } from './dto/competition-query.dto.js';

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
}
