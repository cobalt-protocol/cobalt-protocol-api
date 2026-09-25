import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransferLeadershipDto {
  @ApiProperty({
    description: 'User ID of the new team leader',
    example: '01J8Z9X0000000000000000004',
  })
  @IsNotEmpty()
  @IsString()
  new_leader_id: string;
}
