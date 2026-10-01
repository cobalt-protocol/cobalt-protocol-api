import { Module } from '@nestjs/common';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SubmissionProjectController } from './submission-project.controller.js';
import { SubmissionProjectService } from './submission-project.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SubmissionProjectController],
  providers: [SubmissionProjectService, AuthSessionGuard],
  exports: [SubmissionProjectService],
})
export class SubmissionProjectModule {}
