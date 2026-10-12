import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateChainTeamDto {
  @ApiPropertyOptional({ description: 'Team name', example: 'Cyber Warriors' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Team visibility (true public, false private)', example: true })
  @IsOptional()
  @IsBoolean()
  visibility?: boolean;

  @ApiPropertyOptional({ description: 'Team description', example: 'Building decentralized AI' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'List of skills needed', type: [String], example: ['Frontend'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills_team?: string[];
}
