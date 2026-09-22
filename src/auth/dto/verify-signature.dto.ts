import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEthereumAddress,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class VerifySignatureDto {
  @ApiProperty({
    description: 'Ethereum wallet address of the user',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress!: string;

  @ApiProperty({
    description:
      'Cryptographic signature produced by signing the nonce message with wallet',
    example: '0x...',
  })
  @IsNotEmpty()
  @IsString()
  signature!: string;

  @ApiPropertyOptional({
    description: 'Nonce string that was signed',
  })
  @IsOptional()
  @IsString()
  nonce?: string;

  @ApiPropertyOptional({
    description: 'Full message text that was signed',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
