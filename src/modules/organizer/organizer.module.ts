import { Module } from '@nestjs/common';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { OrganizerCompetitionController } from './organizer-competition.controller.js';
import { OrganizerCompetitionService } from './organizer-competition.service.js';

@Module({
  controllers: [OrganizerCompetitionController],
  providers: [OrganizerCompetitionService, AuthSessionGuard],
})
export class OrganizerModule {}
