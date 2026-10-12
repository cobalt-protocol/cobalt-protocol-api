import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class JoinTeamByCodeDto {
  @ApiProperty({
    description:
      'Team code used to join a team (value from the `team_code` table)',
    example: 'COBALT-ABC12',
  })
  @IsNotEmpty()
  @IsString()
  team_code: string;
}
