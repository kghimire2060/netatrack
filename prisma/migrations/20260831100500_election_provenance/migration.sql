-- AlterTable
ALTER TABLE "ElectionEvent" ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ALTER COLUMN "startsAt" DROP NOT NULL;
