import { Module } from '@nestjs/common';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
@Module({ controllers: [DashboardController], providers: [DashboardService, AuthSessionGuard] })
export class DashboardModule {}
