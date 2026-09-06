-- CreateEnum
CREATE TYPE "ElectedPost" AS ENUM ('MAYOR', 'DEPUTY_MAYOR', 'CHAIRPERSON', 'VICE_CHAIRPERSON', 'WARD_CHAIRPERSON', 'WARD_MEMBER', 'WOMAN_MEMBER', 'DALIT_WOMAN_MEMBER', 'DCC_CHIEF', 'DCC_DEPUTY_CHIEF', 'HOUSE_OF_REPRESENTATIVES', 'PROVINCIAL_ASSEMBLY', 'OTHER');

-- AlterTable
ALTER TABLE "Candidacy" ADD COLUMN     "ageAtElection" INTEGER,
ADD COLUMN     "post" "ElectedPost",
ADD COLUMN     "symbolUrl" TEXT,
ADD COLUMN     "wardNumber" INTEGER;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "post" "ElectedPost",
ADD COLUMN     "remark" TEXT,
ADD COLUMN     "wardNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Candidacy_electionId_constituencyId_post_wardNumber_idx" ON "Candidacy"("electionId", "constituencyId", "post", "wardNumber");

-- CreateIndex
CREATE INDEX "Result_electionId_constituencyId_post_wardNumber_idx" ON "Result"("electionId", "constituencyId", "post", "wardNumber");

