import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChainController } from './chain.controller.js';
import { ChainService } from './chain.service.js';

@Module({
  controllers: [ChainController],
  providers: [ChainService, PrismaService],
  exports: [ChainService],
})
export class ChainModule {}
