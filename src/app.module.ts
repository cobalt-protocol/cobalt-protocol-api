import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import './common/utils/bigint.util.js';
import { HealthModule } from './health/health.module.js';
import { CompetitionModule } from './modules/competition/competition.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { OrganizerModule } from './modules/organizer/organizer.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrizeWinnerModule } from './prize-winner/prize-winner.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CompetitionModule,
    PrizeWinnerModule,
    TeamModule,
    DashboardModule,
    OrganizerModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
