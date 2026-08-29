/**
 * One-off migration from the previous NetaTrack implementation.
 *
 * The old app's tables are snake_case and live in the same Neon database as the
 * new PascalCase tables, so this is a same-database copy. Nothing is dropped or
 * altered on the old side — it stays readable as a fallback.
 *
 *   npx tsx scripts/migrate-legacy-data.ts            # dry run, prints a plan
 *   npx tsx scripts/migrate-legacy-data.ts --apply    # writes
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so a
 * re-run updates rather than duplicating.
 */
import { Prisma, PrismaClient, type GovernmentLevel, type IssueStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** Bikram Sambat runs ~56.7 years ahead of the Gregorian calendar. */
const bsToAd = (bs: number) => bs - 57;

const LEVEL: Record<string, GovernmentLevel> = {
  federal: "FEDERAL",
  provincial: "PROVINCIAL",
  local: "LOCAL",
};

const ISSUE_STATUS: Record<string, IssueStatus> = {
  raised: "RAISED",
  ongoing: "ONGOING",
  priority: "PRIORITY",
  resolved: "RESOLVED",
};

/** Old free-text categories mapped onto the configured complaint categories. */
const CATEGORY: Record<string, string> = {
  water: "Water & Sanitation",
  electricity: "Electricity",
  road: "Infrastructure",
  health: "Health",
  education: "Education",
  corruption: "Corruption",
  environment: "Environment",
  safety: "Public Safety",
};

const COMPLAINT_STATUS = {
  submitted: "SUBMITTED",
  reviewing: "UNDER_REVIEW",
  verified: "VERIFIED",
  assigned: "ASSIGNED",
  in_progress: "IN_PROGRESS",
  resolved: "RESOLVED",
  closed: "CLOSED",
} as const;

const PARTY_NAMES: Record<string, string> = {
  NC: "Nepali Congress",
  UML: "CPN (Unified Marxist–Leninist)",
  NCP: "Communist Party of Nepal",
  RSP: "Rastriya Swatantra Party",
  RPP: "Rastriya Prajatantra Party",
  SSP: "Samajbadi Party",
};

const counts: Record<string, number> = {};
const bump = (key: string, n = 1) => (counts[key] = (counts[key] ?? 0) + n);

const q = <T>(sql: string) => db.$queryRawUnsafe<T[]>(sql);

/**
 * Neon is a network hop away, so one round trip per row makes a 500-row table
 * take minutes. Prisma sends an array of operations as a single batched
 * transaction, which turns each chunk into one round trip.
 */
async function batched<T>(ops: Prisma.PrismaPromise<unknown>[], size = 50): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ops.length; i += size) {
    const chunk = ops.slice(i, i + size);
    out.push(...((await db.$transaction(chunk)) as T[]));
    process.stdout.write(`\r    ${Math.min(i + size, ops.length)}/${ops.length}   `);
  }
  if (ops.length) process.stdout.write("\n");
  return out;
}

async function main() {
  console.log(APPLY ? "APPLYING legacy migration\n" : "DRY RUN — pass --apply to write\n");

  // Guard: refuse to run if the legacy tables are not present.
  const present = await q<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema='public' and table_name in ('users','candidates','constituencies','elections')"
  );
  if (present.length < 4) {
    throw new Error("Legacy tables not found in this database — is DATABASE_URL pointing at the right place?");
  }

  // ---------------------------------------------------------------- users
  // The two legacy accounts are development accounts on a .local domain with
  // argon2 hashes this codebase cannot verify. They are migrated so that
  // reports and audit entries keep their author, but deliberately land
  // SUSPENDED with an unusable password rather than becoming live production
  // logins.
  const users = await q<{
    id: string; email: string; display_name: string; role: string;
    email_verified_at: Date | null; created_at: Date;
    failed_login_count: number; disabled_at: Date | null;
  }>("select id, email, display_name, role, email_verified_at, created_at, failed_login_count, disabled_at from users");

  const userIdMap = new Map<string, string>();
  for (const u of users) {
    const role = u.role === "admin" ? "ADMIN" : u.role === "staff" ? "STAFF" : "CITIZEN";
    if (APPLY) {
      const created = await db.user.upsert({
        where: { email: u.email },
        update: { fullName: u.display_name },
        create: {
          email: u.email,
          fullName: u.display_name,
          // Unusable: a fresh random secret nobody holds.
          passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
          role,
          status: "SUSPENDED",
          emailVerified: Boolean(u.email_verified_at),
          failedLoginCount: u.failed_login_count ?? 0,
          createdAt: u.created_at,
        },
        select: { id: true },
      });
      userIdMap.set(u.id, created.id);
    }
    bump("users");
  }

  // -------------------------------------------------------------- parties
  const partyRows = await q<{ party: string }>(
    "select distinct party from candidates where party is not null and party <> ''"
  );
  const partyMap = new Map<string, string>();
  for (const { party } of partyRows) {
    const slug = party.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (APPLY) {
      const created = await db.party.upsert({
        where: { slug },
        update: {},
        create: { slug, name: PARTY_NAMES[party] ?? party, shortName: party },
        select: { id: true },
      });
      partyMap.set(party, created.id);
    }
    bump("parties");
  }

  // --------------------------------------------------------- constituencies
  // Two passes: create every row first, then wire the provincial → federal
  // nesting, since a parent may appear after its child.
  const consts = await q<{
    id: string; slug: string; name: string; province: string; district: string;
    voters: number | null; polling_stations: number | null; wards: number | null;
    level: string; number: number | null; segment: string | null; parent_id: string | null;
  }>("select id, slug, name, province, district, voters, polling_stations, wards, level::text as level, number, segment, parent_id from constituencies");

  const constIdMap = new Map<string, string>();
  if (APPLY) {
    console.log("  constituencies…");
    const ops = consts.map((c) =>
      db.constituency.upsert({
        where: { slug: c.slug },
        update: {
          registeredVoters: c.voters,
          pollingStationCount: c.polling_stations,
          wards: c.wards,
          number: c.number,
          segment: c.segment,
          level: LEVEL[c.level] ?? "FEDERAL",
        },
        create: {
          slug: c.slug,
          name: c.name,
          province: c.province,
          district: c.district,
          registeredVoters: c.voters,
          pollingStationCount: c.polling_stations,
          wards: c.wards,
          number: c.number,
          segment: c.segment,
          level: LEVEL[c.level] ?? "FEDERAL",
        },
        select: { id: true },
      })
    );
    const created = await batched<{ id: string }>(ops);
    consts.forEach((c, i) => constIdMap.set(c.id, created[i].id));
  }
  bump("constituencies", consts.length);

  if (APPLY) {
    console.log("  constituency nesting…");
    const nestOps = consts
      .filter((c) => c.parent_id && constIdMap.has(c.id) && constIdMap.has(c.parent_id))
      .map((c) =>
        db.constituency.update({
          where: { id: constIdMap.get(c.id)! },
          data: { parentId: constIdMap.get(c.parent_id!)! },
        })
      );
    await batched(nestOps);
    bump("constituency nesting", nestOps.length);
  } else {
    bump("constituency nesting", consts.filter((c) => c.parent_id).length);
  }

  // ------------------------------------------------------ polling stations
  const stations = await q<{
    id: string; name: string; ward_range: string | null; booths: number | null; constituency_id: string;
  }>("select id, name, ward_range, booths, constituency_id from polling_stations");
  for (const s of stations) {
    const constituencyId = constIdMap.get(s.constituency_id);
    if (APPLY && constituencyId) {
      const code = `LEGACY-${s.id.slice(0, 8)}`.toUpperCase();
      await db.pollingStation.upsert({
        where: { code },
        update: { name: s.name, wardRange: s.ward_range, booths: s.booths },
        create: { code, name: s.name, wardRange: s.ward_range, booths: s.booths, constituencyId },
      });
    }
    bump("polling stations");
  }

  // --------------------------------------------------- constituency issues
  const issues = await q<{
    constituency_id: string; title: string; status: string; position: number;
  }>("select constituency_id, title, status::text as status, position from constituency_issues");
  for (const i of issues) {
    const constituencyId = constIdMap.get(i.constituency_id);
    if (APPLY && constituencyId) {
      const existing = await db.constituencyIssue.findFirst({
        where: { constituencyId, title: i.title },
        select: { id: true },
      });
      if (existing) {
        await db.constituencyIssue.update({
          where: { id: existing.id },
          data: { status: ISSUE_STATUS[i.status] ?? "RAISED", position: i.position },
        });
      } else {
        await db.constituencyIssue.create({
          data: { constituencyId, title: i.title, status: ISSUE_STATUS[i.status] ?? "RAISED", position: i.position },
        });
      }
    }
    bump("constituency issues");
  }

  // ----------------------------------------------------------- candidates
  const candidates = await q<{
    id: string; slug: string; full_name: string; constituency_id: string | null;
    party: string | null; office: string | null; pr_group: string | null;
    terms_served: number | null; incumbent: boolean; independent: boolean;
    level: string; published: boolean; created_at: Date;
  }>("select id, slug, full_name, constituency_id, party, office, pr_group, terms_served, incumbent, independent, level::text as level, published, created_at from candidates");

  const candidateIdMap = new Map<string, string>();
  const candidateByName = new Map<string, string>();
  if (APPLY) {
    console.log("  candidates…");
    const ops = candidates.map((c) =>
      db.candidate.upsert({
        where: { slug: c.slug },
        update: {
          fullName: c.full_name,
          office: c.office,
          prGroup: c.pr_group,
          termsServed: c.terms_served,
          isIncumbent: c.incumbent,
          isIndependent: c.independent,
          level: LEVEL[c.level] ?? "FEDERAL",
          partyId: c.party ? (partyMap.get(c.party) ?? null) : null,
          constituencyId: c.constituency_id ? (constIdMap.get(c.constituency_id) ?? null) : null,
        },
        create: {
          slug: c.slug,
          fullName: c.full_name,
          office: c.office,
          prGroup: c.pr_group,
          termsServed: c.terms_served,
          isIncumbent: c.incumbent,
          isIndependent: c.independent,
          level: LEVEL[c.level] ?? "FEDERAL",
          // Migrated records carry no source attribution yet, so they stay
          // unverified until the editorial team reviews them.
          verificationStatus: "PENDING",
          partyId: c.party ? (partyMap.get(c.party) ?? null) : null,
          constituencyId: c.constituency_id ? (constIdMap.get(c.constituency_id) ?? null) : null,
          createdAt: c.created_at,
        },
        select: { id: true },
      })
    );
    const created = await batched<{ id: string }>(ops);
    candidates.forEach((c, i) => {
      candidateIdMap.set(c.id, created[i].id);
      candidateByName.set(c.full_name.toLowerCase(), created[i].id);
    });
  }
  bump("candidates", candidates.length);

  // ------------------------------------------------------------ elections
  const elections = await q<{
    id: string; slug: string; name: string; level: string; bs_year: number;
    status: string; constituency_count: number | null; candidate_count: number | null;
  }>("select id, slug, name, level::text as level, bs_year, status, constituency_count, candidate_count from elections");

  const electionIdMap = new Map<string, string>();
  for (const e of elections) {
    if (APPLY) {
      const created = await db.election.upsert({
        where: { slug: e.slug },
        update: { name: e.name, bsYear: e.bs_year },
        create: {
          slug: e.slug,
          name: e.name,
          type: "FEDERAL",
          level: LEVEL[e.level] ?? "FEDERAL",
          year: bsToAd(e.bs_year),
          bsYear: e.bs_year,
          // "Nomination phase" predates polling day.
          status: "UPCOMING",
          totalSeats: e.constituency_count,
          description: `Migrated from the previous NetaTrack system. Original status: ${e.status}.`,
          sourceName: "Legacy NetaTrack dataset",
        },
        select: { id: true },
      });
      electionIdMap.set(e.id, created.id);
    }
    bump("elections");
  }

  // -------------------------------------------------- election milestones
  const milestones = await q<{
    election_id: string; label: string; bs_date: string | null; detail: string | null; position: number;
  }>("select election_id, label, bs_date, detail, position from election_milestones order by position");
  for (const m of milestones) {
    const electionId = electionIdMap.get(m.election_id);
    if (APPLY && electionId) {
      const existing = await db.electionEvent.findFirst({
        where: { electionId, title: m.label },
        select: { id: true },
      });
      const data = {
        title: m.label,
        detail: m.detail,
        bsDate: m.bs_date,
        // No Gregorian date exists in the source; order is preserved instead.
        startsAt: new Date(Date.now() + m.position * 86_400_000),
      };
      if (existing) await db.electionEvent.update({ where: { id: existing.id }, data });
      else await db.electionEvent.create({ data: { ...data, electionId } });
    }
    bump("election milestones");
  }

  // ---------------------------------------------------- historical results
  const results = await q<{
    constituency_id: string; bs_year: number; winner_name: string;
    winner_affiliation: string | null; margin: number | null;
  }>("select constituency_id, bs_year, winner_name, winner_affiliation, margin from election_results");
  for (const r of results) {
    const constituencyId = constIdMap.get(r.constituency_id);
    if (APPLY && constituencyId) {
      await db.historicalResult.upsert({
        where: {
          constituencyId_bsYear_winnerName: {
            constituencyId,
            bsYear: r.bs_year,
            winnerName: r.winner_name,
          },
        },
        update: { winnerAffiliation: r.winner_affiliation, margin: r.margin },
        create: {
          constituencyId,
          bsYear: r.bs_year,
          winnerName: r.winner_name,
          winnerAffiliation: r.winner_affiliation,
          margin: r.margin,
          sourceName: "Legacy NetaTrack dataset",
        },
      });
    }
    bump("historical results");
  }

  // ----------------------------------------------------------------- news
  // Two of the six posts are fact checks by `kind`, and their titles already
  // carry a verdict, so they migrate into FactCheck rather than NewsArticle.
  const posts = await q<{
    slug: string; title: string; kind: string; excerpt: string | null;
    body: string | null; published_at: Date | null; author_id: string | null;
  }>("select slug, title, kind, excerpt, body, published_at, author_id from news_posts");

  for (const p of posts) {
    if (p.kind === "fact_check") {
      const verdict = /partly true/i.test(p.title)
        ? "MOSTLY_TRUE"
        : /misleading/i.test(p.title)
          ? "MISLEADING"
          : /false/i.test(p.title)
            ? "FALSE"
            : /\btrue\b/i.test(p.title)
              ? "TRUE"
              : "UNVERIFIED";
      const claim = p.title.replace(/^Claim:\s*/i, "").replace(/\s*—\s*Rated:.*$/i, "").replace(/^[“"]|[”"]$/g, "");
      if (APPLY) {
        await db.factCheck.upsert({
          where: { slug: p.slug },
          update: { claim, summary: p.excerpt, analysis: p.body },
          create: {
            slug: p.slug,
            claim,
            summary: p.excerpt,
            analysis: p.body,
            verdict,
            status: p.published_at ? "PUBLISHED" : "DRAFT",
            publishedAt: p.published_at,
            reviewerId: p.author_id ? (userIdMap.get(p.author_id) ?? null) : null,
          },
        });
      }
      bump("fact checks");
    } else {
      if (APPLY) {
        await db.newsArticle.upsert({
          where: { slug: p.slug },
          update: { title: p.title, excerpt: p.excerpt, body: p.body ?? p.excerpt ?? p.title },
          create: {
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            body: p.body ?? p.excerpt ?? p.title,
            category: p.kind.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
            status: p.published_at ? "PUBLISHED" : "DRAFT",
            publishedAt: p.published_at,
            authorId: p.author_id ? (userIdMap.get(p.author_id) ?? null) : null,
            sources: "Migrated from the previous NetaTrack system.",
          },
        });
      }
      bump("news articles");
    }
  }

  // ------------------------------------------------------- citizen reports
  const reports = await q<{
    id: string; user_id: string | null; constituency_id: string | null; category: string;
    title: string; description: string | null; status: string; created_at: Date;
  }>("select id, user_id, constituency_id, category, title, description, status::text as status, created_at from citizen_reports order by created_at");

  for (const [index, r] of reports.entries()) {
    if (APPLY) {
      // Legacy reports keep a distinct tracking series so they can never
      // collide with IDs the live generator issues.
      const trackingId = `NT-LEGACY-${String(index + 1).padStart(5, "0")}`;
      const status = COMPLAINT_STATUS[r.status as keyof typeof COMPLAINT_STATUS] ?? "SUBMITTED";
      const existing = await db.complaint.findUnique({ where: { trackingId }, select: { id: true } });
      if (!existing) {
        await db.complaint.create({
          data: {
            trackingId,
            title: r.title,
            description: r.description ?? r.title,
            category: CATEGORY[r.category] ?? "Other",
            status,
            createdAt: r.created_at,
            resolvedAt: status === "RESOLVED" ? r.created_at : null,
            reporterId: r.user_id ? (userIdMap.get(r.user_id) ?? null) : null,
            constituencyId: r.constituency_id ? (constIdMap.get(r.constituency_id) ?? null) : null,
            events: {
              create: {
                status,
                actorLabel: "Citizen",
                publicUpdate: "Migrated from the previous NetaTrack system.",
                createdAt: r.created_at,
              },
            },
          },
        });
      }
    }
    bump("citizen issues");
  }

  // ----------------------------------------------------------- audit trail
  const audits = await q<{
    actor_id: string | null; actor_role: string | null; action: string;
    resource_type: string | null; resource_id: string | null; ip: string | null;
    user_agent: string | null; created_at: Date;
  }>("select actor_id, actor_role, action, resource_type, resource_id, ip, user_agent, created_at from audit_logs order by created_at");

  if (APPLY) {
    const already = await db.auditLog.count({ where: { action: { startsWith: "legacy." } } });
    if (already === 0) {
      for (const a of audits) {
        await db.auditLog.create({
          data: {
            actorId: a.actor_id ? (userIdMap.get(a.actor_id) ?? null) : null,
            actorRole: a.actor_role === "admin" ? "ADMIN" : a.actor_role === "citizen" ? "CITIZEN" : null,
            action: `legacy.${a.action}`,
            targetType: a.resource_type,
            targetId: a.resource_id,
            ip: a.ip,
            userAgent: a.user_agent,
            changeSummary: "Imported from the previous NetaTrack system",
            createdAt: a.created_at,
          },
        });
      }
    }
  }
  bump("audit entries", audits.length);

  console.log("Records processed:");
  for (const [k, v] of Object.entries(counts)) console.log("  " + k.padEnd(24) + v);
  if (!APPLY) console.log("\nNothing was written. Re-run with --apply.");
}

main()
  .catch((error) => {
    console.error("\nMigration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
