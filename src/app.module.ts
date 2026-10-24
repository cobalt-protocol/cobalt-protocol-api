import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { CompetitionModule } from './competition/competition.module.js';
import { PriceCompetitionModule } from './price-competition/price-competition.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import './common/utils/bigint.util.js';
import { ChainModule } from './modules/chain/chain.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { CertificateModule } from './modules/certificate/certificate.module.js';
import { SignatureSetWinnerModule } from './modules/signature-set-winner/signature-set-winner.module.js';
import { SignatureCreateCompetitionModule } from './modules/signature-create-competition/signature-create-competition.module.js';
import { SignatureTeamPaymentModule } from './modules/signature-team-payment/signature-team-payment.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    PrismaModule,
    AuthModule,
    CompetitionModule,
    PriceCompetitionModule,
    ChainModule,
    TeamModule,
    CertificateModule,
    SignatureSetWinnerModule,
    SignatureCreateCompetitionModule,
    SignatureTeamPaymentModule,
  ],
  controllers: [],
  providers: [
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
export class AppModule { }
