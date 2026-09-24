import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransferLeadershipDto {
  @ApiProperty({ example: '01J8Z9X0000000000000000003' })
  @IsString()
  @IsNotEmpty()
  newLeaderUserId: string;
}
