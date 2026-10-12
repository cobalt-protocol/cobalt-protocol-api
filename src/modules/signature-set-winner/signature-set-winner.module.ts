import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SignatureSetWinnerController } from './signature-set-winner.controller.js';
import { SignatureSetWinnerService } from './signature-set-winner.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SignatureSetWinnerController],
  providers: [SignatureSetWinnerService, PrismaService, AuthSessionGuard],
  exports: [SignatureSetWinnerService],
})
export class SignatureSetWinnerModule {}
