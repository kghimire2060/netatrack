-- CreateEnum
CREATE TYPE "LocalBodyType" AS ENUM ('METROPOLITAN', 'SUB_METROPOLITAN', 'MUNICIPALITY', 'RURAL_MUNICIPALITY');

-- AlterTable
ALTER TABLE "Constituency" ADD COLUMN     "areaSqKm" DOUBLE PRECISION,
ADD COLUMN     "localBodyType" "LocalBodyType",
ADD COLUMN     "nameNe" TEXT,
ADD COLUMN     "population" INTEGER,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceUrl" TEXT;
