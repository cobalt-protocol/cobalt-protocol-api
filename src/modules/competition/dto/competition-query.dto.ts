import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CompetitionQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  query?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  category?: string;
  @ApiPropertyOptional({ enum: ['newest', 'deadline'] }) @IsOptional() @IsIn(['newest', 'deadline'])
  sort?: 'newest' | 'deadline';
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 12 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit = 12;
}
