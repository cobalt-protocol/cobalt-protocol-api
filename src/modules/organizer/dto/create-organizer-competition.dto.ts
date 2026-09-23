import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOrganizerCompetitionDto {
  @ApiProperty({ example: 'Cobalt Buildathon 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @ApiProperty({ example: 'Web3' })
  @IsString()
  @MaxLength(80)
  category: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  description: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  requirements: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxTeamSize?: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  registrationEndsAt: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  submissionDeadline: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  judgingEndsAt: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  resultsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  guidebookCid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateCid?: string;
}
