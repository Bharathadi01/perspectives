-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('woman', 'man', 'non_binary');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'queer', 'asexual', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "SelfieStatus" AS ENUM ('unverified', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('photo', 'audio');

-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('post', 'selfie');

-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('photo', 'audio');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('style', 'fitness', 'looks', 'voice', 'vibe', 'other');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('pending_moderation', 'active', 'paused', 'removed', 'archived');

-- CreateEnum
CREATE TYPE "PerspectiveStatus" AS ENUM ('submitted', 'pending_moderation', 'delivered', 'helpful', 'archived', 'reported', 'removed');

-- CreateEnum
CREATE TYPE "FeedbackVerdict" AS ENUM ('helpful', 'not_helpful');

-- CreateEnum
CREATE TYPE "NotHelpfulReason" AS ENUM ('vague', 'irrelevant', 'insulting', 'sexual', 'spam', 'unsafe');

-- CreateEnum
CREATE TYPE "AssignmentSlot" AS ENUM ('boost', 'mandatory');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'given', 'skipped', 'replaced');

-- CreateEnum
CREATE TYPE "ConnectRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('active', 'unmatched', 'blocked');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('profile', 'post', 'perspective', 'message');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('nudity_sexual', 'body_shaming', 'harassment_hate', 'threat_violence', 'self_harm', 'scam_impersonation', 'underage', 'spam', 'other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('unreviewed', 'human_review', 'allowed', 'removed');

-- CreateEnum
CREATE TYPE "DeletionJobStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "userId" UUID NOT NULL,
    "displayName" TEXT,
    "gender" "Gender",
    "heightCm" INTEGER,
    "orientation" "Orientation",
    "city" TEXT,
    "audienceGenders" "Gender"[] DEFAULT ARRAY[]::"Gender"[],
    "audienceMinAge" INTEGER,
    "audienceMaxAge" INTEGER,
    "selfieStatus" "SelfieStatus" NOT NULL DEFAULT 'unverified',
    "selfieMediaId" UUID,
    "selfieCheckedAt" TIMESTAMP(3),
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "purpose" "MediaPurpose" NOT NULL DEFAULT 'post',
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "PostKind" NOT NULL,
    "mediaId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "category" "PostCategory" NOT NULL,
    "focusAreas" TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perspectives" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "giverId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "chips" TEXT[],
    "status" "PerspectiveStatus" NOT NULL DEFAULT 'delivered',
    "verdict" "FeedbackVerdict",
    "notHelpfulReason" "NotHelpfulReason",
    "thankedAt" TIMESTAMP(3),
    "receivedDayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_progress" (
    "userId" UUID NOT NULL,
    "dayKey" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_progress_pkey" PRIMARY KEY ("userId","dayKey")
);

-- CreateTable
CREATE TABLE "daily_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dayKey" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "targetId" UUID NOT NULL,
    "slot" "AssignmentSlot" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skips" (
    "id" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_skips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connect_requests" (
    "id" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "perspectiveId" UUID NOT NULL,
    "status" "ConnectRequestStatus" NOT NULL DEFAULT 'pending',
    "receivedDayKey" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connect_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'active',
    "originRequestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL,
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporterId" UUID,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'unreviewed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_jobs" (
    "id" UUID NOT NULL,
    "status" "DeletionJobStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "deletion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE INDEX "profiles_isLive_gender_idx" ON "profiles"("isLive", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "media_storageKey_key" ON "media"("storageKey");

-- CreateIndex
CREATE INDEX "media_ownerId_idx" ON "media"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "posts_mediaId_key" ON "posts"("mediaId");

-- CreateIndex
CREATE INDEX "posts_ownerId_status_position_idx" ON "posts"("ownerId", "status", "position");

-- CreateIndex
CREATE INDEX "perspectives_ownerId_receivedDayKey_idx" ON "perspectives"("ownerId", "receivedDayKey");

-- CreateIndex
CREATE INDEX "perspectives_giverId_ownerId_idx" ON "perspectives"("giverId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "perspectives_postId_giverId_key" ON "perspectives"("postId", "giverId");

-- CreateIndex
CREATE INDEX "daily_assignments_userId_dayKey_status_idx" ON "daily_assignments"("userId", "dayKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_assignments_userId_dayKey_targetId_key" ON "daily_assignments"("userId", "dayKey", "targetId");

-- CreateIndex
CREATE INDEX "profile_skips_viewerId_createdAt_idx" ON "profile_skips"("viewerId", "createdAt");

-- CreateIndex
CREATE INDEX "connect_requests_receiverId_status_idx" ON "connect_requests"("receiverId", "status");

-- CreateIndex
CREATE INDEX "connect_requests_senderId_receiverId_status_idx" ON "connect_requests"("senderId", "receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connections_originRequestId_key" ON "connections"("originRequestId");

-- CreateIndex
CREATE INDEX "connections_userAId_status_idx" ON "connections"("userAId", "status");

-- CreateIndex
CREATE INDEX "connections_userBId_status_idx" ON "connections"("userBId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connections_userAId_userBId_key" ON "connections"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "messages_connectionId_createdAt_id_idx" ON "messages"("connectionId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_actorId_scope_key_key" ON "idempotency_keys"("actorId", "scope", "key");

-- CreateIndex
CREATE INDEX "deletion_jobs_status_createdAt_idx" ON "deletion_jobs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perspectives" ADD CONSTRAINT "perspectives_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perspectives" ADD CONSTRAINT "perspectives_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perspectives" ADD CONSTRAINT "perspectives_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assignments" ADD CONSTRAINT "daily_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assignments" ADD CONSTRAINT "daily_assignments_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skips" ADD CONSTRAINT "profile_skips_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skips" ADD CONSTRAINT "profile_skips_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connect_requests" ADD CONSTRAINT "connect_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connect_requests" ADD CONSTRAINT "connect_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connect_requests" ADD CONSTRAINT "connect_requests_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "perspectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_originRequestId_fkey" FOREIGN KEY ("originRequestId") REFERENCES "connect_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

