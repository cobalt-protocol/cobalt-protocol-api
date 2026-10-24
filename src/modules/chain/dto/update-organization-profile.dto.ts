import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationProfileDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Google Developer Student Clubs',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Organization short description',
    example: 'Tell participants about your organization...',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL or IPFS gateway URL',
    example: 'http://localhost:8081/ipfs/Qm...',
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}

