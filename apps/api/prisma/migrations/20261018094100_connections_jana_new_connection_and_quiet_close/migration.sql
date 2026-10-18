-- CreateEnum
CREATE TYPE "ConnectionCloseReason" AS ENUM ('no_reply', 'no_message', 'inactive');

-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedReason" "ConnectionCloseReason",
ADD COLUMN     "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "firstReplySeenAt" TIMESTAMP(3),
ADD COLUMN     "userASeenAt" TIMESTAMP(3),
ADD COLUMN     "userBSeenAt" TIMESTAMP(3);

-- Existing connections: count from when they were made, and do not celebrate them again.
UPDATE "connections" SET "connectedAt" = "createdAt", "userASeenAt" = CURRENT_TIMESTAMP, "userBSeenAt" = CURRENT_TIMESTAMP;
