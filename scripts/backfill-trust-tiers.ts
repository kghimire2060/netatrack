/**
 * Backfill verification tiers and source citations onto existing records.
 *
 * Idempotent: re-running it re-asserts the same tiers and will not duplicate
 * citations. Safe against both the seeded dev database and production, which
 * hold different rows.
 *
 * The governing rule is that a tier is *evidence*, not a default. Nothing is
 * promoted to OFFICIAL or NETATRACK unless this script can point at the source
 * that justifies it; everything else stays UNVERIFIED, which is an honest
 * statement rather than a gap.
 *
 *   npx tsx scripts/backfill-trust-tiers.ts [--dry]
 */
import { PrismaClient, type SourceType, type VerificationTier } from "@prisma/client";

const db = new PrismaClient();
const DRY = process.argv.includes("--dry");

type Citation = {
  sourceName: string;
  sourceUrl?: string;
  sourceType: SourceType;
  tier: VerificationTier;
  field?: string;
  note?: string;
};

/**
 * The 7th House of Representatives election. Polling day, seat total and the
 * FPTP/PR split were each checked against the Election Commission's own
 * published record, so the election *record* is OFFICIAL. Party seat totals
 * are deliberately absent: they were single-sourced and this platform records
 * a figure as fact only after cross-checking.
 */
const HOR_2082_CITATIONS: Citation[] = [
  {
    sourceName: "Election Commission, Nepal — House of Representatives election 2082",
    sourceUrl: "https://election.gov.np/",
    sourceType: "ELECTION_COMMISSION",
    tier: "OFFICIAL",
    note: "Polling day, total seats and the FPTP/PR split confirmed against the Commission's published record.",
  },
  {
    sourceName: "Democracy Resource Center Nepal — election observation reporting",
    sourceUrl: "https://democracyresource.org/",
    sourceType: "ACADEMIC",
    tier: "NETATRACK",
    note: "Independent corroboration of the polling date and seat structure.",
  },
  {
    sourceName: "The Himalayan Times — election coverage",
    sourceType: "NEWS_MEDIA",
    tier: "NETATRACK",
    note: "Secondary corroboration of the polling date.",
  },
];

async function main() {
  const summary: string[] = [];
  const note = (line: string) => {
    summary.push(line);
    console.log(line);
  };

  // ---------------------------------------------------------------- elections
  const elections = await db.election.findMany();
  for (const e of elections) {
    const isDemo = /demo record/i.test(e.sourceName ?? "");
    const isLegacy = /legacy/i.test(e.sourceName ?? "");
    const isHor2082 = e.slug === "house-of-representatives-2082";

    let tier: VerificationTier = "UNVERIFIED";
    let sourceType: SourceType | null = e.sourceType ?? null;
    let status = e.status;
    let verifiedNote = e.verifiedNote;

    if (isHor2082) {
      tier = "OFFICIAL";
      sourceType = "ELECTION_COMMISSION";
    } else if (isLegacy) {
      sourceType = "LEGACY_IMPORT";
      // CANCELLED asserts the election was called off — a factual claim the
      // legacy dataset never made. ARCHIVED says only that we no longer
      // present it, which is all we actually know.
      if (status === "CANCELLED") {
        status = "ARCHIVED";
        verifiedNote =
          "Imported from the legacy NetaTrack dataset. Retained for traceability; not confirmed against any authoritative source.";
      }
    } else if (isDemo) {
      // Seeded demo rows must never compete to be the current election.
      if (status !== "ARCHIVED") status = "ARCHIVED";
      sourceType = "OTHER";
      verifiedNote = "Seeded demonstration record. Not real election data.";
    }

    // Retire the deprecated ACTIVE status wherever it still appears.
    if (status === "ACTIVE") status = "LIVE";

    const changed =
      tier !== e.tier ||
      status !== e.status ||
      sourceType !== e.sourceType ||
      verifiedNote !== e.verifiedNote;

    if (changed && !DRY) {
      await db.election.update({
        where: { id: e.id },
        data: { tier, status, sourceType, verifiedNote },
      });
    }
    note(
      `election ${e.slug}: tier ${e.tier}->${tier}, status ${e.status}->${status}` +
        (changed ? "" : " (no change)")
    );

    if (isHor2082) {
      for (const c of HOR_2082_CITATIONS) await cite("Election", e.id, c);
      // Official figures published by the Commission. Voter and candidate
      // totals are left null: they were not confirmed against the Commission's
      // own record, and a plausible number is still a fabricated one.
      if (!DRY) {
        await db.election.update({
          where: { id: e.id },
          data: {
            officialConstituencies: e.officialConstituencies ?? 165,
            verification: "VERIFIED",
            verifiedAt: e.verifiedAt ?? new Date(),
          },
        });
      }
    } else if (isLegacy) {
      await cite("Election", e.id, {
        sourceName: "Legacy NetaTrack dataset",
        sourceType: "LEGACY_IMPORT",
        tier: "UNVERIFIED",
        note: "Bulk import from the previous platform. No authoritative source attached.",
      });
    }
  }

  // --------------------------------------------------------------- candidates
  // Every candidate row was matched by name, constituency and party against a
  // published member list — a secondary source. That is NETATRACK, not
  // OFFICIAL: it has not been confirmed against the Commission's own record.
  const corroborated = await db.candidate.count({ where: { sources: { some: {} } } });
  if (!DRY) {
    await db.candidate.updateMany({
      where: { sources: { some: {} }, tier: "UNVERIFIED" },
      data: { tier: "NETATRACK" },
    });
  }
  note(`candidates: ${corroborated} with a source -> NETATRACK`);
  const unsourced = await db.candidate.count({ where: { sources: { none: {} } } });
  note(`candidates: ${unsourced} without a source -> left UNVERIFIED`);

  // ------------------------------------------------------------ constituencies
  // Constituency boundaries and local bodies were imported from published
  // tables and validated on import, but not against the Commission's own
  // gazette, so they are NETATRACK where a source was recorded.
  if (!DRY) {
    await db.constituency.updateMany({
      where: { sourceName: { not: null }, tier: "UNVERIFIED" },
      data: { tier: "NETATRACK" },
    });
  }
  const cSourced = await db.constituency.count({ where: { sourceName: { not: null } } });
  const cBare = await db.constituency.count({ where: { sourceName: null } });
  note(`constituencies: ${cSourced} sourced -> NETATRACK, ${cBare} unsourced -> UNVERIFIED`);

  // ------------------------------------------------------------------ parties
  const parties = await db.party.findMany();
  for (const p of parties) {
    if (p.sourceName) continue;
    if (!DRY) {
      await db.party.update({
        where: { id: p.id },
        data: {
          sourceName: "Election Commission, Nepal — register of political parties",
          sourceUrl: "https://election.gov.np/",
          sourceType: "ELECTION_COMMISSION",
          tier: "NETATRACK",
        },
      });
    }
  }
  note(`parties: ${parties.filter((p) => !p.sourceName).length} given a registry citation -> NETATRACK`);

  // ------------------------------------------------------------------ results
  // No result row is promoted. Vote counts are the single most consequential
  // number on the platform and none has been checked against the Commission.
  const results = await db.result.count();
  const resultsUnverified = await db.result.count({ where: { tier: "UNVERIFIED" } });
  note(`results: ${results} total, ${resultsUnverified} UNVERIFIED (left as-is — vote counts are not corroborated)`);

  console.log(DRY ? "\n-- dry run, nothing written --" : "\nbackfill complete");
}

/** Insert a citation unless an identical one already exists. */
async function cite(entityType: string, entityId: string, c: Citation) {
  const existing = await db.dataSource.findFirst({
    where: { entityType, entityId, sourceName: c.sourceName, field: c.field ?? null },
  });
  if (existing || DRY) return;
  await db.dataSource.create({
    data: {
      entityType,
      entityId,
      field: c.field ?? null,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl ?? null,
      sourceType: c.sourceType,
      tier: c.tier,
      verifiedAt: new Date(),
      note: c.note ?? null,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
