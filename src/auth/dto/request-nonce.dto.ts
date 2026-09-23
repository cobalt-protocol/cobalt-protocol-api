import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class RequestNonceDto {
  @ApiProperty({
    description: 'Ethereum wallet address of the user',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress!: string;
}
