import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompetitionController } from './competition.controller.js';
import { CompetitionService } from './competition.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CompetitionController],
  providers: [CompetitionService, PrismaService],
  exports: [CompetitionService],
})
export class CompetitionModule {}

