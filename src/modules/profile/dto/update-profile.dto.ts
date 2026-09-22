import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ProfileSkillDto } from './profile-skill.dto.js';
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'alexrivera_ai' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,32}$/)
  username?: string;
  @ApiPropertyOptional({ example: 'alex@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  institution?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pitch?: string;
  @ApiPropertyOptional({ type: [ProfileSkillDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProfileSkillDto)
  skills?: ProfileSkillDto[];
}
