import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CertificateController } from './certificate.controller.js';
import { CertificateService } from './certificate.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CertificateController],
  providers: [CertificateService, PrismaService, AuthSessionGuard],
  exports: [CertificateService],
})
export class CertificateModule {}
