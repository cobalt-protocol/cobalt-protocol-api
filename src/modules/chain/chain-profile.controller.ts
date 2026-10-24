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
  Post,
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
import { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto.js';
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

  @Patch('organization')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update organization profile for authenticated user',
    description:
      'Checks if the authenticated user (from JWT user_id) has a relation in table `organization`. If not found, creates and inserts a new organization record linked to `user_id`; if found, updates the existing organization record with JSON payload `{ name, description, avatar_url }`.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization profile created or updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid session',
  })
  async updateOrganizationProfile(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateOrganizationProfileDto,
  ) {
    return this.chainService.updateOrganizationProfile(
      req.userId,
      chainId,
      dto,
    );
  }

  @Post('organization')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update organization profile for authenticated user (POST alias)',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization profile created or updated successfully',
  })
  async createOrUpdateOrganizationProfile(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateOrganizationProfileDto,
  ) {
    return this.chainService.updateOrganizationProfile(
      req.userId,
      chainId,
      dto,
    );
  }
}
