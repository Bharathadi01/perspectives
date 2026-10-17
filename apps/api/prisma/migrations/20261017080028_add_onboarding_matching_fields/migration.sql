-- CreateEnum
CREATE TYPE "DatingIntention" AS ENUM ('long_term', 'long_term_open', 'short_term_open', 'casual', 'friendship', 'figuring_out');

-- CreateEnum
CREATE TYPE "LifestylePace" AS ENUM ('early_bird', 'night_owl', 'balanced', 'active_adventurer', 'laid_back');

-- CreateEnum
CREATE TYPE "SocialPreference" AS ENUM ('introvert', 'extrovert', 'ambivert', 'small_groups', 'social_butterfly');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "datingIntention" "DatingIntention",
ADD COLUMN     "intentionDealbreaker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lifestylePace" "LifestylePace",
ADD COLUMN     "personalityPrompts" JSONB,
ADD COLUMN     "pronouns" TEXT,
ADD COLUMN     "socialPreference" "SocialPreference";
