import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { ProfileQueryDto } from './dto/profile-query.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfileService } from './profile.service.js';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}
  @Get()
  @ApiOperation({ summary: 'Search public builder profiles' })
  findAll(@Query() query: ProfileQueryDto) {
    return this.profiles.findAll(query);
  }
  @Get('me')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  getMe(@Req() request: AuthenticatedRequest) {
    return this.profiles.findMine(request.userId);
  }
  @Patch('me')
  @UseGuards(AuthSessionGuard)
  @ApiBearerAuth()
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profiles.updateMine(request.userId, dto);
  }
  @Get(':username')
  @ApiOperation({ summary: 'Get public profile by username' })
  getPublic(@Param('username') username: string) {
    return this.profiles.findPublic(username);
  }
}
