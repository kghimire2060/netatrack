-- CreateTable
CREATE TABLE "_ConstituencyNews" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConstituencyNews_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ConstituencyNews_B_index" ON "_ConstituencyNews"("B");

-- AddForeignKey
ALTER TABLE "_ConstituencyNews" ADD CONSTRAINT "_ConstituencyNews_A_fkey" FOREIGN KEY ("A") REFERENCES "Constituency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConstituencyNews" ADD CONSTRAINT "_ConstituencyNews_B_fkey" FOREIGN KEY ("B") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
