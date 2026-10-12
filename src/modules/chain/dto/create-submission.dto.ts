import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'My Awesome Project' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Description of project' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://github.com/org/repo' })
  @IsString()
  submission_link!: string;

  @ApiProperty({ example: 'QmXyz...' })
  @IsString()
  document_cid!: string;
}
