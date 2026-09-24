import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CompetitionPublicationStatus } from '../../../generated/prisma/client.js';

export class OrganizerCompetitionQueryDto {
  @ApiPropertyOptional({ enum: CompetitionPublicationStatus })
  @IsOptional()
  @IsEnum(CompetitionPublicationStatus)
  status?: CompetitionPublicationStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
