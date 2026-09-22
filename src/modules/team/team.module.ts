import { Module } from '@nestjs/common';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';
@Module({ controllers: [TeamController], providers: [TeamService, AuthSessionGuard] })
export class TeamModule {}
