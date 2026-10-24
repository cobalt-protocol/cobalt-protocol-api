import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSignatureTeamPaymentDto {
  @ApiPropertyOptional({
    description:
      'Competition ID (database ULID `competition.id` or on-chain `competition.competition_id` uint256 string). Required if not passed in the URL path.',
    example: '1',
  })
  @IsOptional()
  competition_id?: string | number;

  @ApiPropertyOptional({
    description: 'CamelCase alias for competition_id',
    example: '1',
  })
  @IsOptional()
  competitionId?: string | number;

  @ApiPropertyOptional({
    description:
      'IPFS CID string for team metadata (used in paymentCreateTeam(_competitionId, cid, _signature))',
    example: 'QmTeamMetadataCID...',
  })
  @IsOptional()
  @IsString()
  cid?: string;
}

