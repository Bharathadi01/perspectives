-- CreateEnum
CREATE TYPE "ReviewReason" AS ENUM ('reporters', 'serious_report', 'weak_giver');

-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('dismissed', 'banned_temporary', 'banned_permanent');

-- CreateEnum
CREATE TYPE "BanKind" AS ENUM ('temporary', 'permanent');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('open', 'upheld', 'restored');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NoticeKind" ADD VALUE 'weak_giver_tip';
ALTER TYPE "NoticeKind" ADD VALUE 'account_restored';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'banned';

-- AlterTable
ALTER TABLE "perspectives" ADD COLUMN     "feedbackAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "fromFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subjectId" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "review_cases" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" "ReviewReason" NOT NULL,
    "hides" BOOLEAN NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedBy" UUID,
    "outcome" "ReviewOutcome",

    CONSTRAINT "review_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "BanKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),

    CONSTRAINT "bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" UUID NOT NULL,
    "banId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" UUID,
    "decisionReason" TEXT,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giver_quality" (
    "userId" UUID NOT NULL,
    "weak" BOOLEAN NOT NULL DEFAULT false,
    "weakSince" TIMESTAMP(3),
    "flaggedAt" TIMESTAMP(3),
    "lowEffortMarks" INTEGER NOT NULL DEFAULT 0,
    "helpfulMarks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "giver_quality_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "totpSecret" TEXT NOT NULL,
    "lastTotpStep" INTEGER,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSignInAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" UUID,
    "targetId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_emails" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_emails_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE INDEX "review_cases_userId_closedAt_idx" ON "review_cases"("userId", "closedAt");

-- CreateIndex
CREATE INDEX "review_cases_closedAt_openedAt_idx" ON "review_cases"("closedAt", "openedAt");

-- CreateIndex
CREATE INDEX "bans_userId_createdAt_idx" ON "bans"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_banId_key" ON "appeals"("banId");

-- CreateIndex
CREATE INDEX "appeals_status_createdAt_idx" ON "appeals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "giver_quality_weak_idx" ON "giver_quality"("weak");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_audit_log_targetUserId_createdAt_idx" ON "admin_audit_log"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_createdAt_idx" ON "admin_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "reports_subjectId_createdAt_idx" ON "reports"("subjectId", "createdAt");

-- AddForeignKey
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bans" ADD CONSTRAINT "bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_banId_fkey" FOREIGN KEY ("banId") REFERENCES "bans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giver_quality" ADD CONSTRAINT "giver_quality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: who each existing report is about.
UPDATE "reports" SET "subjectId" = "targetId" WHERE "targetType" = 'profile';
UPDATE "reports" r SET "subjectId" = p."ownerId" FROM "posts" p WHERE r."targetType" = 'post' AND p."id" = r."targetId";
UPDATE "reports" r SET "subjectId" = x."giverId" FROM "perspectives" x WHERE r."targetType" = 'perspective' AND x."id" = r."targetId";
UPDATE "reports" r SET "subjectId" = m."senderId" FROM "messages" m WHERE r."targetType" = 'message' AND m."id" = r."targetId";

-- Backfill: existing marks count from when the perspective was given.
UPDATE "perspectives" SET "feedbackAt" = "createdAt" WHERE "verdict" IS NOT NULL;
