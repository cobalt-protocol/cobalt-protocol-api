import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompetitionController } from './competition.controller.js';
import { CompetitionService } from './competition.service.js';

@Module({
  controllers: [CompetitionController],
  providers: [CompetitionService, PrismaService],
  exports: [CompetitionService],
})
export class CompetitionModule {}
