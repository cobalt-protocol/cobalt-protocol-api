import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSignatureSetWinnerDto {
  @ApiProperty({
    description: 'Team ID (ULID) — team whose LEAD will be used as _participant',
    example: '01HXYZ...',
  })
  @IsString()
  @IsNotEmpty()
  team_id!: string;

  @ApiProperty({
    description:
      'PrizeWinner row ID (prize_winner.id — ULID string). The on-chain uint256 used for the hash/signature is the column prize_winner.winner_id from that row (maps to _winnerId in CompetitionManager.setWinner).',
    example: '01HZYX...',
  })
  @IsString()
  @IsNotEmpty()
  winner_id!: string;
}
