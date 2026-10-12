import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CertificateQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by competition ID (ULID or on-chain competition_id)',
    example: '01JXXXXX...',
  })
  @IsOptional()
  @IsString()
  competitionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by chain ID (via competition.indexer_state.chain_id or certificate.indexer_state.chain_id)',
    example: 31337,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chainId?: number;

  @ApiPropertyOptional({
    description: 'Search by uri (contains, case-insensitive)',
    example: 'ipfs://',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
