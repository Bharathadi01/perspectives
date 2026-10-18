-- Catch-up: schema.prisma gained these in commit 4eeae2f without a migration.
-- Adds the 'text' post kind, makes posts.mediaId optional, and adds posts.audioMediaId.

-- AlterEnum
ALTER TYPE "PostKind" ADD VALUE 'text';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "audioMediaId" UUID,
ALTER COLUMN "mediaId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "posts_audioMediaId_key" ON "posts"("audioMediaId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

