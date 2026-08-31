-- CreateTable
CREATE TABLE "_CandidateNews" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CandidateNews_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CandidateNews_B_index" ON "_CandidateNews"("B");

-- AddForeignKey
ALTER TABLE "_CandidateNews" ADD CONSTRAINT "_CandidateNews_A_fkey" FOREIGN KEY ("A") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidateNews" ADD CONSTRAINT "_CandidateNews_B_fkey" FOREIGN KEY ("B") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
