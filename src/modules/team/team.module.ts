import { Module } from '@nestjs/common';
import { AuthSessionGuard, OptionalAuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [TeamController],
  providers: [TeamService, AuthSessionGuard, OptionalAuthSessionGuard],
  exports: [TeamService],
})
export class TeamModule {}
