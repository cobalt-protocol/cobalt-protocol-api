import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCompetitionTeamDto {
  @ApiPropertyOptional({
    description: 'Team name',
    example: 'Cyber Warriors',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Team visibility (true for public, false for private)',
    example: true,
  })
  @IsBoolean()
  visibility: boolean;

  @ApiProperty({
    description: 'Team description',
    example: 'Building decentralized AI applications and zero-knowledge proofs',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'List of skills needed or suggested for the team',
    type: [String],
    example: ['Frontend Developer', 'Smart Contract Engineer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'List of skills needed or suggested for the team (alias)',
    type: [String],
    example: ['Frontend Developer', 'Smart Contract Engineer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills_suggestion?: string[];

  @ApiPropertyOptional({
    description: 'List of skills needed or suggested for the team (alias)',
    type: [String],
    example: ['Frontend Developer', 'Smart Contract Engineer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills_suggestions?: string[];
}
