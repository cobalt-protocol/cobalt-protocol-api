import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class TeamQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  query?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 6 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit = 6;
}
