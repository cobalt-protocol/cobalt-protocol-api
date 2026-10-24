import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SignatureCreateCompetitionController } from './signature-create-competition.controller.js';
import { SignatureCreateCompetitionService } from './signature-create-competition.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SignatureCreateCompetitionController],
  providers: [
    SignatureCreateCompetitionService,
    PrismaService,
    AuthSessionGuard,
  ],
  exports: [SignatureCreateCompetitionService],
})
export class SignatureCreateCompetitionModule {}

