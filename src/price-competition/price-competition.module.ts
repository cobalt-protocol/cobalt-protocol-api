import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PriceCompetitionController } from './price-competition.controller.js';
import { PriceCompetitionService } from './price-competition.service.js';

@Module({
  controllers: [PriceCompetitionController],
  providers: [PriceCompetitionService, PrismaService],
  exports: [PriceCompetitionService],
})
export class PriceCompetitionModule {}

