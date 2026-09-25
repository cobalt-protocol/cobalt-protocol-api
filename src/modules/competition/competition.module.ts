import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { CompetitionController } from "./competition.controller.js"
import { CompetitionService } from "./competition.service.js"

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'cobalt-secret-key-change-in-production',
    }),
  ],
  controllers: [CompetitionController],
  providers: [CompetitionService],
})
export class CompetitionModule {}
