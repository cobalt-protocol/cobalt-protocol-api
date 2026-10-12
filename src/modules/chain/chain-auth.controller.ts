import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NoCacheInterceptor } from '../../common/interceptors/no-cache.interceptor.js';
import { AuthService } from '../../auth/auth.service.js';
import { RequestNonceDto } from '../../auth/dto/request-nonce.dto.js';
import { VerifySignatureDto } from '../../auth/dto/verify-signature.dto.js';

@ApiTags('Chains Auth')
@Controller('chains/:chain_id/auth')
export class ChainAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate an authentication nonce for a wallet address',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 201,
    description: 'Nonce generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address',
  })
  async createNonce(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Body() dto: RequestNonceDto,
  ) {
    return this.authService.generateNonce(dto, chainId);
  }

  @Post('verify/nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify wallet signature against nonce to authenticate',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Signature verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or request parameters',
  })
  async verifySignature(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Body() dto: VerifySignatureDto,
  ) {
    return this.authService.verifySignature(dto, chainId);
  }

  @Get('me')
  @UseInterceptors(NoCacheInterceptor)
  @HttpCode(HttpStatus.OK)
  @Header(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  @ApiOperation({
    summary: 'Get current user profile using authorization header',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized header or invalid token',
  })
  async getMe(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.authService.getMe(authHeader);
  }
}
