-- AlterTable
ALTER TABLE "Election" ADD COLUMN     "fptpSeats" INTEGER,
ADD COLUMN     "prSeats" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedNote" TEXT;
