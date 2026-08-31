-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM ('OFFICIAL', 'NETATRACK', 'UNVERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ELECTION_COMMISSION', 'GOVERNMENT', 'COURT', 'NEWS_MEDIA', 'PARTY_OFFICIAL', 'ACADEMIC', 'ENCYCLOPEDIA', 'LEGACY_IMPORT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ElectionStatus" ADD VALUE 'LIVE';
ALTER TYPE "ElectionStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "Constituency" ADD COLUMN     "sourceType" "SourceType",
ADD COLUMN     "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "Election" ADD COLUMN     "countingStartAt" TIMESTAMP(3),
ADD COLUMN     "nominationEndAt" TIMESTAMP(3),
ADD COLUMN     "nominationStartAt" TIMESTAMP(3),
ADD COLUMN     "officialCandidates" INTEGER,
ADD COLUMN     "officialConstituencies" INTEGER,
ADD COLUMN     "officialVoters" INTEGER,
ADD COLUMN     "resultDeclaredAt" TIMESTAMP(3),
ADD COLUMN     "sourceType" "SourceType",
ADD COLUMN     "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceType" "SourceType",
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "sourceType" "SourceType",
ADD COLUMN     "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'OTHER',
    "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSource_entityType_entityId_idx" ON "DataSource"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DataSource_sourceType_idx" ON "DataSource"("sourceType");

-- CreateIndex
CREATE INDEX "Election_tier_electionDate_idx" ON "Election"("tier", "electionDate");
