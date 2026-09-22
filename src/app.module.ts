import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { HealthModule } from './health/health.module.js';
import { CompetitionModule } from './modules/competition/competition.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    PrismaModule,
    HealthModule,
    ProfileModule,
    CompetitionModule,
    TeamModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
