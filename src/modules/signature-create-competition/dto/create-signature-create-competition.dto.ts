import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CompetitionPaymentInputDto {
  @ApiProperty({
    description:
      'Team registration fee token address (0x0000000000000000000000000000000000000000 for native token)',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @ApiPropertyOptional({
    description: 'Snake_case alias for tokenAddress',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsOptional()
  @IsString()
  token_address?: string;

  @ApiProperty({
    description: 'Team registration fee amount in wei (uint256 string or number)',
    example: '0',
  })
  @IsOptional()
  fee?: string | number;
}

export class CompetitionStructInputDto {
  @ApiPropertyOptional({
    description: 'On-chain competition ID (uint256, defaults to 0 when creating a new competition)',
    example: '0',
    default: '0',
  })
  @IsOptional()
  id?: string | number;

  @ApiProperty({
    description: 'IPFS CID of competition metadata JSON',
    example: 'QmCompetitionMetadataCID...',
  })
  @IsString()
  @IsNotEmpty()
  cid!: string;

  @ApiProperty({
    description: 'Team formation ("1-3 member" or "1-5 member")',
    example: '1-3 member',
  })
  @IsString()
  @IsNotEmpty()
  formation!: string;

  @ApiPropertyOptional({
    description:
      'Organization wallet address (defaults to authenticated user wallet_address if omitted or zero address)',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    description: 'Unix timestamp (seconds) when competition ends & prize/certificate claim opens',
    example: '1763164800',
  })
  @IsOptional()
  prizeCertificateClaim?: string | number;

  @ApiPropertyOptional({
    description: 'Snake_case alias for prizeCertificateClaim',
    example: '1763164800',
  })
  @IsOptional()
  prize_certificate_claim?: string | number;

  @ApiPropertyOptional({
    description: 'IPFS CID of participant certificate template',
    example: 'QmParticipantCertificateCID...',
  })
  @IsOptional()
  @IsString()
  certificateCID?: string;

  @ApiPropertyOptional({
    description: 'Snake_case alias for certificateCID',
    example: 'QmParticipantCertificateCID...',
  })
  @IsOptional()
  @IsString()
  certificate_cid?: string;

  @ApiPropertyOptional({
    description:
      'Nested payment struct inside _competition (if omitted, automatically uses top-level payment)',
    type: () => CompetitionPaymentInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompetitionPaymentInputDto)
  payment?: CompetitionPaymentInputDto;
}

export class CompetitionWinnerInputDto {
  @ApiPropertyOptional({
    description: 'Winner ID (uint256, defaults to 0 when creating a new competition)',
    example: '0',
    default: '0',
  })
  @IsOptional()
  id?: string | number;

  @ApiPropertyOptional({
    description: 'Competition ID (uint256, defaults to 0 when creating a new competition)',
    example: '0',
    default: '0',
  })
  @IsOptional()
  competitionId?: string | number;

  @ApiPropertyOptional({
    description: 'Snake_case alias for competitionId',
    example: '0',
  })
  @IsOptional()
  competition_id?: string | number;

  @ApiPropertyOptional({
    description:
      'Prize token address (0x0000000000000000000000000000000000000000 for native token)',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsOptional()
  @IsString()
  prizeToken?: string;

  @ApiPropertyOptional({
    description: 'Snake_case alias for prizeToken',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsOptional()
  @IsString()
  prize_token?: string;

  @ApiPropertyOptional({
    description: 'Prize amount in wei (uint256 string or number, must be > 0)',
    example: '1000000000000000000',
  })
  @IsOptional()
  prizeAmount?: string | number;

  @ApiPropertyOptional({
    description: 'Snake_case alias for prizeAmount',
    example: '1000000000000000000',
  })
  @IsOptional()
  prize_amount?: string | number;

  @ApiPropertyOptional({
    description: 'IPFS CID of winner certificate template',
    example: 'QmWinnerCertificateCID...',
  })
  @IsOptional()
  @IsString()
  certificateCID?: string;

  @ApiPropertyOptional({
    description: 'Snake_case alias for certificateCID',
    example: 'QmWinnerCertificateCID...',
  })
  @IsOptional()
  @IsString()
  certificate_cid?: string;
}

export class CreateSignatureCreateCompetitionDto {
  @ApiPropertyOptional({
    description: 'Competitions struct (_competition) matching CompetitionCreationModule.sol. Optional when pre-checking organization profile.',
    type: () => CompetitionStructInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompetitionStructInputDto)
  competition?: CompetitionStructInputDto;

  @ApiPropertyOptional({
    description:
      'CompetitionPayment struct (_payment) matching CompetitionCreationModule.sol (can also be supplied in competition.payment)',
    type: () => CompetitionPaymentInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompetitionPaymentInputDto)
  payment?: CompetitionPaymentInputDto;

  @ApiPropertyOptional({
    description: 'Winners[] array (_winners) matching CompetitionCreationModule.sol. Optional when pre-checking organization profile.',
    type: () => [CompetitionWinnerInputDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompetitionWinnerInputDto)
  winners?: CompetitionWinnerInputDto[];

  @ApiPropertyOptional({
    description: 'Platform fee option ID (_priceCompetitionFeeId uint256)',
    example: '1',
  })
  @IsOptional()
  priceCompetitionFeeId?: string | number;

  @ApiPropertyOptional({
    description: 'Snake_case alias for priceCompetitionFeeId',
    example: '1',
  })
  @IsOptional()
  price_competition_fee_id?: string | number;

  @ApiPropertyOptional({
    description:
      'Optional database competition.id (ULID) to associate with signature_create_competition.competition_id',
    example: null,
  })
  @IsOptional()
  @IsString()
  competition_id?: string;

  @ApiPropertyOptional({
    description:
      'Optional chain ID (used when calling the non-chain-scoped endpoint to resolve indexer_state)',
    example: 3636,
  })
  @IsOptional()
  chain_id?: number | string;
}

