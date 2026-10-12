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
  Patch,
  Req,
  UseGuards,
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
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import type { AuthenticatedRequest } from '../../auth/auth-session.guard.js';
import { ChainService } from './chain.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@ApiTags('Chains Profiles')
@Controller('chains/:chain_id/profiles')
export class ChainProfileController {
  constructor(
    private readonly chainService: ChainService,
    private readonly authService: AuthService,
  ) {}

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
    summary: 'Get current user profile for specific chain',
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

  @Patch('me')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update current user profile for specific chain',
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
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid session',
  })
  async updateProfile(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.chainService.updateProfile(req.userId, chainId, dto);
  }
}
