import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from './common/api-exception.filter.js';

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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
