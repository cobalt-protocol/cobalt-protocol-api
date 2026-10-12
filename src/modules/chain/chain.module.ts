import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChainController } from './chain.controller.js';
import { ChainService } from './chain.service.js';
import { ChainAuthController } from './chain-auth.controller.js';
import { ChainProfileController } from './chain-profile.controller.js';
import { AuthModule } from '../../auth/auth.module.js';
import {
  AuthSessionGuard,
  OptionalAuthSessionGuard,
} from '../../auth/auth-session.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [ChainController, ChainAuthController, ChainProfileController],
  providers: [ChainService, PrismaService, AuthSessionGuard, OptionalAuthSessionGuard],
  exports: [ChainService],
})
export class ChainModule {}

