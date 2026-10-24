-- CreateEnum
CREATE TYPE "ProfileGoal" AS ENUM ('get_perspectives', 'meet_people');

-- CreateEnum
CREATE TYPE "NoticeKind" AS ENUM ('audience_widened');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "audienceChosenMaxAge" INTEGER,
ADD COLUMN     "audienceChosenMinAge" INTEGER,
ADD COLUMN     "goals" "ProfileGoal"[] DEFAULT ARRAY[]::"ProfileGoal"[];

-- CreateTable
CREATE TABLE "notices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "NoticeKind" NOT NULL,
    "data" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notices_userId_createdAt_idx" ON "notices"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notices_userId_dedupeKey_key" ON "notices"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the range people already have is the range they chose.
UPDATE "profiles" SET "audienceChosenMinAge" = "audienceMinAge", "audienceChosenMaxAge" = "audienceMaxAge";
