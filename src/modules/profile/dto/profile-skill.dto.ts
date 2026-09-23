import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export const skillLevels = [
  'Intermediate',
  'Proficient',
  'Advanced',
  'Expert',
] as const;
export type ProfileSkillLevel = (typeof skillLevels)[number];
export class ProfileSkillDto {
  @ApiProperty({ example: 'LangGraph & Agents' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
  @ApiProperty({ enum: skillLevels, example: 'Expert' })
  @IsIn(skillLevels)
  level: ProfileSkillLevel;
}
