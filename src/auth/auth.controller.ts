import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RequestNonceDto } from './dto/request-nonce.dto.js';
import { VerifySignatureDto } from './dto/verify-signature.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('nonce')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate an authentication nonce for a wallet address',
  })
  @ApiResponse({
    status: 201,
    description: 'Nonce generated successfully',
    schema: {
      example: {
        data: {
          nonce: '4c7d080623b3dcd8ebd41f38f7ac7804',
          user: {
            id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
            wallet_address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
            username: null,
            email: null,
            location: null,
            institution: null,
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
          },
        },
        message: 'Nonce generated successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address',
    schema: {
      example: {
        data: null,
        message: 'Validation failed',
        errors: ['walletAddress must be an Ethereum address'],
      },
    },
  })
  async createNonce(@Body() dto: RequestNonceDto) {
    return this.authService.generateNonce(dto);
  }

  @Post('verify/nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify wallet signature against nonce to authenticate',
  })
  @ApiResponse({
    status: 200,
    description: 'Signature verified successfully',
    schema: {
      example: {
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
            wallet_address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
            username: null,
            email: null,
            location: null,
            institution: null,
            role: 'user',
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
          },
        },
        message: 'Signature verified successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or request parameters',
    schema: {
      example: {
        data: null,
        message: 'Invalid cryptographic signature for wallet address',
        errors: null,
      },
    },
  })
  async verifySignature(@Body() dto: VerifySignatureDto) {
    return this.authService.verifySignature(dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user profile using authorization header',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        data: {
          user: {
            id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
            wallet_address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
            username: null,
            email: null,
            location: null,
            institution: null,
            role: 'user',
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
          },
        },
        message: 'User profile retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized header or invalid token',
    schema: {
      example: {
        data: null,
        message: 'Missing authorization header',
        errors: null,
      },
    },
  })
  async getMe(@Headers('authorization') authHeader?: string) {
    return this.authService.getMe(authHeader);
  }
}
