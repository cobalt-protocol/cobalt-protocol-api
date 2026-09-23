import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrizeWinnerController } from './prize-winner.controller.js';
import { PrizeWinnerService } from './prize-winner.service.js';

@Module({
  controllers: [PrizeWinnerController],
  providers: [PrizeWinnerService, PrismaService],
  exports: [PrizeWinnerService],
})
export class PrizeWinnerModule {}
