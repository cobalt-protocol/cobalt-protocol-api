import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateTeamDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(24)
  name: string;
  @ApiProperty({ enum: ['public', 'private'] }) @IsIn(['public', 'private'])
  visibility: 'public' | 'private';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  requirements?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  roles?: string[];
}
