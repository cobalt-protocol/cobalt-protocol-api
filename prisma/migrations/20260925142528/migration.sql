/*
  Warnings:

  - The `deleted_at` column on the `skill_description` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_at` column on the `social_media` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[slug]` on the table `competition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tx_hash]` on the table `competition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tx_hash]` on the table `organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,skill_name]` on the table `skills` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,competition_id]` on the table `team_role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,team_id]` on the table `team_role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `winner` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[prize_winner_id]` on the table `winner` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `competition_id` to the `competition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `formation` to the `competition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_address` to the `competition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tx_hash` to the `competition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tx_hash` to the `organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `winner_id` to the `prize_winner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `competition_id` to the `team_role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prize_winner_id` to the `winner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `winner` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "CompetitionPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "competition" ADD COLUMN     "competition_id" TEXT NOT NULL,
ADD COLUMN     "formation" TEXT NOT NULL,
ADD COLUMN     "max_team_size" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "organization_id" TEXT,
ADD COLUMN     "priceCompetitionId" TEXT,
ADD COLUMN     "price_competition_id" TEXT,
ADD COLUMN     "publication_status" "CompetitionPublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "token_address" TEXT NOT NULL,
ADD COLUMN     "tx_hash" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "tx_hash" TEXT NOT NULL,
ALTER COLUMN "avatar_url" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "prize_winner" ADD COLUMN     "winner_id" BIGINT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "skill_description" DROP COLUMN "deleted_at",
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "social_media" DROP COLUMN "deleted_at",
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "team_role" ADD COLUMN     "competition_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "institution" DROP NOT NULL;

-- AlterTable
ALTER TABLE "winner" ADD COLUMN     "prize_winner_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_join_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "team_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nonce_connect" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "nonce_connect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nonce_certificate_participant" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "nonce_certificate_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nonce_certificate_winner" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "nonce_certificate_winner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_token_prize" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "listing_token_prize_id" BIGINT NOT NULL,
    "token_address" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "listing_token_prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_deposited" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "treasury_prize_id" BIGINT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "token_address" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prize_deposited_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_competition" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "price_competition_fee_id" BIGINT NOT NULL,
    "treasury_fee" DECIMAL(65,30) NOT NULL,
    "token_address" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "price_competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_fee_paid" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "token_address" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "competition_fee_paid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_winner" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "winner_id" BIGINT NOT NULL,
    "participant" TEXT NOT NULL,
    "participant_winner_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "participant_winner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_distributed" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "treasury_prize_id" BIGINT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "token_address" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prize_distributed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_state" (
    "id" TEXT NOT NULL,
    "contract_name" TEXT NOT NULL,
    "last_scanned_block" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "indexer_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_participant_minted" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "token_id" BIGINT NOT NULL,
    "participant" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "certificate_participant_minted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_participant_winner_minted" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "token_id" BIGINT NOT NULL,
    "participant" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "winner_id" BIGINT NOT NULL,
    "uri" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "certificate_participant_winner_minted_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "team_join_requests_team_id_status_idx" ON "team_join_requests"("team_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "team_join_requests_competition_id_user_id_key" ON "team_join_requests"("competition_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nonce_connect_nonce_key" ON "nonce_connect"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "nonce_connect_user_id_key" ON "nonce_connect"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nonce_certificate_participant_nonce_key" ON "nonce_certificate_participant"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "nonce_certificate_winner_nonce_key" ON "nonce_certificate_winner"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "price_competition_price_competition_fee_id_key" ON "price_competition"("price_competition_fee_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_fee_paid_competition_id_key" ON "competition_fee_paid"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "indexer_state_contract_name_key" ON "indexer_state"("contract_name");

-- CreateIndex
CREATE UNIQUE INDEX "competition_slug_key" ON "competition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "competition_tx_hash_key" ON "competition"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "organization_tx_hash_key" ON "organization"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "skills_user_id_skill_name_key" ON "skills"("user_id", "skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "team_role_user_id_competition_id_key" ON "team_role"("user_id", "competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_role_user_id_team_id_key" ON "team_role"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "winner_user_id_key" ON "winner"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "winner_prize_winner_id_key" ON "winner"("prize_winner_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_priceCompetitionId_fkey" FOREIGN KEY ("priceCompetitionId") REFERENCES "price_competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role" ADD CONSTRAINT "team_role_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winner" ADD CONSTRAINT "winner_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winner" ADD CONSTRAINT "winner_prize_winner_id_fkey" FOREIGN KEY ("prize_winner_id") REFERENCES "prize_winner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nonce_connect" ADD CONSTRAINT "nonce_connect_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nonce_certificate_participant" ADD CONSTRAINT "nonce_certificate_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nonce_certificate_participant" ADD CONSTRAINT "nonce_certificate_participant_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nonce_certificate_winner" ADD CONSTRAINT "nonce_certificate_winner_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nonce_certificate_winner" ADD CONSTRAINT "nonce_certificate_winner_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_deposited" ADD CONSTRAINT "prize_deposited_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_fee_paid" ADD CONSTRAINT "competition_fee_paid_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_winner" ADD CONSTRAINT "participant_winner_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_distributed" ADD CONSTRAINT "prize_distributed_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_participant_minted" ADD CONSTRAINT "certificate_participant_minted_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_participant_winner_minted" ADD CONSTRAINT "certificate_participant_winner_minted_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
