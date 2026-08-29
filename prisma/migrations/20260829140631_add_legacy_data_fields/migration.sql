-- CreateEnum
CREATE TYPE "GovernmentLevel" AS ENUM ('FEDERAL', 'PROVINCIAL', 'LOCAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('RAISED', 'ONGOING', 'PRIORITY', 'RESOLVED');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "isIndependent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" "GovernmentLevel" NOT NULL DEFAULT 'FEDERAL',
ADD COLUMN     "office" TEXT,
ADD COLUMN     "prGroup" TEXT,
ADD COLUMN     "termsServed" INTEGER;

-- AlterTable
ALTER TABLE "Constituency" ADD COLUMN     "level" "GovernmentLevel" NOT NULL DEFAULT 'FEDERAL',
ADD COLUMN     "number" INTEGER,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "pollingStationCount" INTEGER,
ADD COLUMN     "segment" TEXT,
ADD COLUMN     "wards" INTEGER;

-- AlterTable
ALTER TABLE "Election" ADD COLUMN     "bsYear" INTEGER,
ADD COLUMN     "level" "GovernmentLevel" NOT NULL DEFAULT 'FEDERAL';

-- AlterTable
ALTER TABLE "ElectionEvent" ADD COLUMN     "bsDate" TEXT;

-- AlterTable
ALTER TABLE "PollingStation" ADD COLUMN     "booths" INTEGER,
ADD COLUMN     "wardRange" TEXT;

-- CreateTable
CREATE TABLE "ConstituencyIssue" (
    "id" TEXT NOT NULL,
    "constituencyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'RAISED',
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "ConstituencyIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalResult" (
    "id" TEXT NOT NULL,
    "constituencyId" TEXT NOT NULL,
    "bsYear" INTEGER NOT NULL,
    "winnerName" TEXT NOT NULL,
    "winnerAffiliation" TEXT,
    "margin" INTEGER,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConstituencyIssue_constituencyId_position_idx" ON "ConstituencyIssue"("constituencyId", "position");

-- CreateIndex
CREATE INDEX "HistoricalResult_constituencyId_bsYear_idx" ON "HistoricalResult"("constituencyId", "bsYear");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalResult_constituencyId_bsYear_winnerName_key" ON "HistoricalResult"("constituencyId", "bsYear", "winnerName");

-- AddForeignKey
ALTER TABLE "Constituency" ADD CONSTRAINT "Constituency_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Constituency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstituencyIssue" ADD CONSTRAINT "ConstituencyIssue_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalResult" ADD CONSTRAINT "HistoricalResult_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
