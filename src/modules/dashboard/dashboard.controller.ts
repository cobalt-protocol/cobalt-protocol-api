import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthSessionGuard, type AuthenticatedRequest } from '../../auth/auth-session.guard.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@Controller('users/me/dashboard')
@UseGuards(AuthSessionGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get() get(@Req() request: AuthenticatedRequest) { return this.dashboard.getForUser(request.userId); }
}
