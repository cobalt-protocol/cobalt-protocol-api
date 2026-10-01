import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionProjectDto {
  @ApiProperty({
    description: 'Title of the project submission',
    example: 'Cobalt Protocol MVP',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the submission',
    example: 'An end-to-end decentralized hackathon platform built on Web3.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL link to the project repository or demo',
    example: 'https://github.com/cobalt-protocol/mvp',
  })
  @IsString()
  @IsNotEmpty()
  submission_link!: string;

  @ApiProperty({
    description: 'IPFS Document Content Identifier (CID)',
    example: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  })
  @IsString()
  @IsNotEmpty()
  document_cid!: string;
}
