import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthModule } from '../../auth/auth.module.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TeamController],
  providers: [TeamService, PrismaService, AuthSessionGuard],
  exports: [TeamService],
})
export class TeamModule {}
