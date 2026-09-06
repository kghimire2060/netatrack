-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'STALLED', 'CANCELLED', 'UNABLE_TO_VERIFY');

-- CreateEnum
CREATE TYPE "StatementContext" AS ENUM ('PARLIAMENT', 'PRESS_CONFERENCE', 'INTERVIEW', 'SOCIAL_MEDIA', 'CAMPAIGN_RALLY', 'PARTY_EVENT', 'OFFICIAL_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PROJECT_EVIDENCE', 'CONSTITUENCY_VISIT', 'PARLIAMENT', 'PUBLIC_EVENT', 'DOCUMENT_SCAN', 'OTHER');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "fullNameNe" TEXT;

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "representativeId" TEXT;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleNe" TEXT,
    "description" TEXT,
    "sector" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PROPOSED',
    "progressPct" DOUBLE PRECISION,
    "budgetNpr" DECIMAL(16,2),
    "spentNpr" DECIMAL(16,2),
    "startedAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "wardNumber" INTEGER,
    "locationDetail" TEXT,
    "implementingBody" TEXT,
    "constituencyId" TEXT NOT NULL,
    "candidateId" TEXT,
    "promiseId" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "SourceType",
    "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "progressPct" DOUBLE PRECISION,
    "note" TEXT,
    "evidenceUrl" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "quoteNe" TEXT,
    "context" "StatementContext" NOT NULL DEFAULT 'OTHER',
    "venue" TEXT,
    "statedAt" TIMESTAMP(3),
    "topic" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "SourceType",
    "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "factCheckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "projectId" TEXT,
    "kind" "MediaKind" NOT NULL DEFAULT 'OTHER',
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "captionNe" TEXT,
    "altText" TEXT,
    "capturedAt" TIMESTAMP(3),
    "credit" TEXT,
    "sourceUrl" TEXT,
    "tier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_constituencyId_status_idx" ON "Project"("constituencyId", "status");

-- CreateIndex
CREATE INDEX "Project_candidateId_status_idx" ON "Project"("candidateId", "status");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_createdAt_idx" ON "ProjectUpdate"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Statement_candidateId_statedAt_idx" ON "Statement"("candidateId", "statedAt");

-- CreateIndex
CREATE INDEX "Statement_status_statedAt_idx" ON "Statement"("status", "statedAt");

-- CreateIndex
CREATE INDEX "MediaItem_candidateId_status_position_idx" ON "MediaItem"("candidateId", "status", "position");

-- CreateIndex
CREATE INDEX "MediaItem_projectId_status_position_idx" ON "MediaItem"("projectId", "status", "position");

-- CreateIndex
CREATE INDEX "Complaint_representativeId_status_idx" ON "Complaint"("representativeId", "status");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_promiseId_fkey" FOREIGN KEY ("promiseId") REFERENCES "Promise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_factCheckId_fkey" FOREIGN KEY ("factCheckId") REFERENCES "FactCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

