import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, AuthSessionGuard],
})
export class ProfileModule {}
