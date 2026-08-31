/**
 * Election-data correction and verification pass.
 *
 *   npx tsx scripts/verify-election-data.ts          # dry run
 *   npx tsx scripts/verify-election-data.ts --apply
 *
 * WHY THIS EXISTS
 * ---------------
 * An audit of the migrated data found three defects, one of them introduced by
 * the legacy-import script in this repository:
 *
 * 1. FABRICATED TIMESTAMPS (our own bug). The legacy system stored election
 *    milestones only as Bikram Sambat strings ("2081 Jestha 10"). The import
 *    had no Gregorian date, so it synthesised one as `now + position days`.
 *    The homepage then counted down to a timestamp nobody had ever published.
 *    Those timestamps are cleared here; the BS strings are kept.
 *
 * 2. A STALE ELECTION PRESENTED AS UPCOMING. "Federal Election 2081" was
 *    flagged UPCOMING. BS 2081 corresponds to 2024/25 and no federal general
 *    election was held in that year — it is demo data from the previous
 *    system. It is retained (deleting records is worse than labelling them)
 *    but marked unverified and excluded from every "current" surface.
 *
 * 3. A WRONG SEAT COUNT. totalSeats was 77, which was the legacy
 *    `constituency_count` column, not a seat total.
 *
 * WHAT IS WRITTEN, AND ON WHAT AUTHORITY
 * --------------------------------------
 * The real election is added with its source recorded on the row. Facts and
 * where each came from:
 *
 *   - Name, Bikram Sambat year (2082), and that counting has concluded:
 *     Election Commission of Nepal result portal, https://result.election.gov.np/
 *     (the portal is titled "Pratinidhi Sabha Election, 2082" and publishes
 *     separate FPTP and PR result maps).
 *   - Polling date 5 March 2026 (BS 2082 Phalguna 21): agreed by the ECN
 *     schedule as reported by The Himalayan Times, the Democracy Resource
 *     Center factsheet, and Wikipedia.
 *   - 275 seats = 165 FPTP + 110 PR: Wikipedia, consistent with the
 *     constitutional structure and with the ECN portal publishing FPTP and PR
 *     results separately.
 *
 * DELIBERATELY NOT WRITTEN: party seat totals. A single source reported them
 * and the rule for this project is that a figure shown as fact is cross-checked
 * first. Results stay absent rather than arriving unverified.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const ECN = "Election Commission of Nepal";
const ECN_URL = "https://result.election.gov.np/";

/** BS 2082 Phalguna 21. Recorded as UTC midnight — a date, not a claimed time. */
const POLLING_DATE = new Date("2026-03-05T00:00:00.000Z");

async function main() {
  console.log(APPLY ? "APPLYING election corrections\n" : "DRY RUN — pass --apply to write\n");
  const plan: string[] = [];

  // ---- 1. clear the synthesised milestone timestamps ----------------------
  const fabricated = await db.electionEvent.findMany({
    where: { startsAt: { not: null }, bsDate: { not: null } },
    select: { id: true, title: true, bsDate: true, startsAt: true, election: { select: { slug: true } } },
  });
  // Only those belonging to the unverified legacy import, whose Gregorian date
  // was never published anywhere.
  const toClear = fabricated.filter((e) => e.election.slug === "federal-2081");
  for (const e of toClear) {
    plan.push(`clear fake timestamp: "${e.title}" (${e.bsDate}) had ${e.startsAt?.toISOString()}`);
  }
  if (APPLY && toClear.length > 0) {
    await db.electionEvent.updateMany({
      where: { id: { in: toClear.map((e) => e.id) } },
      data: { startsAt: null, sourceName: "Legacy NetaTrack dataset (Gregorian date never published)" },
    });
  }

  // ---- 2. mark the legacy election unverified ----------------------------
  const legacy = await db.election.findUnique({ where: { slug: "federal-2081" } });
  if (legacy) {
    plan.push(`flag legacy election "${legacy.name}" as unverified (was status=${legacy.status}, totalSeats=${legacy.totalSeats})`);
    if (APPLY) {
      await db.election.update({
        where: { id: legacy.id },
        data: {
          status: "CANCELLED",
          verification: "REJECTED",
          verifiedAt: new Date(),
          // totalSeats was the legacy constituency_count, not a seat total.
          totalSeats: null,
          verifiedNote:
            "Unverified legacy import. No federal general election was held in BS 2081; this record originates from the previous system's demo data and is retained for traceability only.",
          sourceName: "Legacy NetaTrack dataset — not an authoritative source",
        },
      });
    }
  }

  // ---- 3. record the real election ---------------------------------------
  plan.push("upsert verified election: House of Representatives Election 2082 (5 Mar 2026)");
  if (APPLY) {
    const election = await db.election.upsert({
      where: { slug: "house-of-representatives-2082" },
      update: {
        status: "COMPLETED",
        electionDate: POLLING_DATE,
        totalSeats: 275,
        fptpSeats: 165,
        prSeats: 110,
        verification: "VERIFIED",
        verifiedAt: new Date(),
        sourceName: ECN,
        sourceUrl: ECN_URL,
      },
      create: {
        slug: "house-of-representatives-2082",
        name: "House of Representatives Election 2082",
        type: "FEDERAL",
        level: "FEDERAL",
        year: 2026,
        bsYear: 2082,
        status: "COMPLETED",
        electionDate: POLLING_DATE,
        totalSeats: 275,
        fptpSeats: 165,
        prSeats: 110,
        verification: "VERIFIED",
        verifiedAt: new Date(),
        sourceName: ECN,
        sourceUrl: ECN_URL,
        verifiedNote:
          "Polling date cross-checked across the ECN schedule as reported by The Himalayan Times, the Democracy Resource Center factsheet and Wikipedia. Seat structure (165 FPTP + 110 PR) from Wikipedia, consistent with the ECN publishing FPTP and PR results separately. Party seat totals deliberately not recorded: single-sourced.",
        description:
          "Nepal's general election for the 275-member House of Representatives, held on 5 March 2026 (BS 2082 Phalguna 21). Counting has concluded; the Election Commission publishes full results on its result portal.",
      },
      select: { id: true },
    });

    // The one milestone we can source, dated and attributed.
    const existing = await db.electionEvent.findFirst({
      where: { electionId: election.id, title: "Polling day" },
      select: { id: true },
    });
    const data = {
      title: "Polling day",
      detail: "Voting for the 275-member House of Representatives.",
      bsDate: "2082 Phalguna 21",
      startsAt: POLLING_DATE,
      sourceName: ECN,
      sourceUrl: ECN_URL,
    };
    if (existing) await db.electionEvent.update({ where: { id: existing.id }, data });
    else await db.electionEvent.create({ data: { ...data, electionId: election.id } });
  }

  // ---- 4. label legacy news and historical results ------------------------
  const staleNews = await db.newsArticle.findMany({
    where: { sources: { contains: "Migrated from the previous" } },
    select: { id: true, title: true, publishedAt: true },
  });
  for (const n of staleNews) {
    plan.push(`label legacy article: "${n.title.slice(0, 48)}…" (${n.publishedAt?.toISOString().slice(0, 10)})`);
  }
  if (APPLY) {
    for (const n of staleNews) {
      await db.newsArticle.update({
        where: { id: n.id },
        data: {
          sources:
            "Imported from the previous NetaTrack system. Original publication source not recorded — treat as historical, not current reporting.",
        },
      });
    }
  }

  console.log("Planned changes:");
  for (const line of plan) console.log("  - " + line);
  if (!APPLY) console.log("\nNothing written.");
  else console.log("\nApplied.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
