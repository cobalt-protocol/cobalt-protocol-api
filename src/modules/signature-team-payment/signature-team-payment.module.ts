import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SignatureTeamPaymentController } from './signature-team-payment.controller.js';
import { SignatureTeamPaymentService } from './signature-team-payment.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SignatureTeamPaymentController],
  providers: [SignatureTeamPaymentService, PrismaService, AuthSessionGuard],
  exports: [SignatureTeamPaymentService],
})
export class SignatureTeamPaymentModule {}

