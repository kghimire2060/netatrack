/**
 * Cross-checks every candidate row against an independent published list of
 * the 275 members returned by the 2026 general election.
 *
 *   npx tsx scripts/crosscheck-members.ts <wikitext-file>            # report
 *   npx tsx scripts/crosscheck-members.ts <wikitext-file> --apply    # + record
 *
 * The reference list is the "7th House of Representatives (Nepal)" member
 * table. That is a secondary source, so a match here is recorded as
 * "corroborated against a published member list", not as confirmation from the
 * Election Commission's own record. Rows that disagree are never auto-corrected
 * — they are reported for a human, because a mismatch could equally mean our
 * row is right and the reference is stale.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const FILE = process.argv[2];

const REFERENCE_URL = "https://en.wikipedia.org/wiki/7th_House_of_Representatives_(Nepal)";
const REFERENCE_NAME = "7th House of Representatives member list (cross-check)";

const PARTY_ABBR: Record<string, string> = {
  "Rastriya Swatantra Party": "RSP",
  "Nepali Congress": "NC",
  "CPN (UML)": "UML",
  "Nepali Communist Party": "NCP",
  "Shram Sanskriti Party": "SSP",
  "Rastriya Prajatantra Party": "RPP",
  Independent: "IND",
};

type Ref = { name: string; constituency: string; party: string; isPR: boolean };

function unlink(s: string) {
  return s
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<ref[^>]*>.*?<\/ref>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/'''?/g, "")
    .trim();
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/**
 * "Jhapa 5" and "Jhapa-5" are the same seat, so separators are unified before
 * the alphanumeric strip rather than after it. A handful of seats are written
 * differently by the two sources without disagreeing about the place.
 */
const SEAT_ALIASES: Record<string, string> = {
  "rukum east": "eastern rukum",
  "rukum west": "western rukum",
  "nawalparasi east": "eastern nawalparasi",
  "nawalparasi west": "western nawalparasi",
  // transliteration variants of the same district (तेह्रथुम)
  "terhathum": "tehrathum",
};

const normSeat = (s: string) => {
  let v = s.replace(/[-–—_]+/g, " ").toLowerCase().normalize("NFKD")
           .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const m = v.match(/^(.*?)\s*(\d+)$/);
  if (m) {
    const base = SEAT_ALIASES[m[1]] ?? m[1];
    v = `${base} ${m[2]}`;
  }
  return v;
};

function parse(wikitext: string): Ref[] {
  const lines = wikitext.split("\n");
  const out: Ref[] = [];
  let party = "";
  let cells: string[] = [];

  const flush = () => {
    // a member row is exactly [constituency, name, remarks?]
    if (cells.length >= 2 && party) {
      const constituency = unlink(cells[0]);
      const name = unlink(cells[1]);
      if (name && /^[A-Z]/.test(name) && !/^Members of|^Officers of/.test(constituency)) {
        const isPR = !/\d/.test(constituency);
        out.push({ name, constituency, party, isPR });
      }
    }
    cells = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const header = line.match(/^!\s*colspan="3".*\|\s*(.+?)\s*\(\d+\)\s*$/);
    if (header) { flush(); party = unlink(header[1]); continue; }
    if (line === "|-") { flush(); continue; }
    if (line.startsWith("|}")) { flush(); party = ""; continue; }
    if (line.startsWith("!")) { cells = []; continue; }
    if (line.startsWith("|")) { cells.push(line.slice(1)); continue; }
    // continuation of a multi-line remarks cell
    if (cells.length > 0 && line) cells[cells.length - 1] += " " + line;
  }
  flush();
  return out;
}

async function main() {
  if (!FILE) throw new Error("Pass the path to the reference wikitext file.");
  const refs = parse(readFileSync(FILE, "utf8"));
  console.log(`reference list parsed: ${refs.length} members ` +
              `(${refs.filter((r) => !r.isPR).length} constituency, ${refs.filter((r) => r.isPR).length} PR)\n`);

  const ours = await db.candidate.findMany({
    select: {
      id: true, fullName: true, prGroup: true,
      party: { select: { shortName: true, name: true } },
      constituency: { select: { name: true } },
    },
  });

  const byName = new Map<string, Ref>();
  const dupes: string[] = [];
  for (const r of refs) {
    const k = norm(r.name);
    if (byName.has(k)) dupes.push(r.name);
    byName.set(k, r);
  }
  if (dupes.length > 0) {
    console.log(`note: ${dupes.length} name(s) appear twice in the reference ` +
                `(listed once as an officer and once as a member): ${dupes.join(", ")}\n`);
  }

  const matched: { id: string; name: string }[] = [];
  const seatMismatch: string[] = [];
  const partyMismatch: string[] = [];
  const notFound: string[] = [];

  for (const c of ours) {
    const ref = byName.get(norm(c.fullName));
    if (!ref) { notFound.push(c.fullName); continue; }

    const ourSeat = c.constituency?.name ?? null;
    const seatOk = ref.isPR ? ourSeat === null : ourSeat !== null && normSeat(ourSeat) === normSeat(ref.constituency);
    const ourParty = c.party?.shortName ?? null;
    const refAbbr = PARTY_ABBR[ref.party] ?? ref.party;
    // An independent has no party row by design, so "no party" is the correct
    // representation of Independent rather than a disagreement.
    const partyOk = refAbbr === "IND" ? ourParty === null : ourParty === refAbbr;

    if (!seatOk) seatMismatch.push(`${c.fullName}: ours="${ourSeat ?? "(PR/none)"}" reference="${ref.constituency}"`);
    else if (!partyOk) partyMismatch.push(`${c.fullName}: ours="${ourParty}" reference="${PARTY_ABBR[ref.party] ?? ref.party}"`);
    else matched.push({ id: c.id, name: c.fullName });
  }

  console.log(`our records: ${ours.length}`);
  console.log(`  matched on name + seat + party : ${matched.length}`);
  console.log(`  seat disagrees                 : ${seatMismatch.length}`);
  console.log(`  party disagrees                : ${partyMismatch.length}`);
  console.log(`  name not in reference list     : ${notFound.length}`);

  const show = (label: string, xs: string[]) => {
    if (xs.length === 0) return;
    console.log(`\n${label}`);
    xs.slice(0, 15).forEach((x) => console.log("   " + x));
    if (xs.length > 15) console.log(`   … and ${xs.length - 15} more`);
  };
  show("SEAT DISAGREEMENTS (for human review — not auto-corrected):", seatMismatch);
  show("PARTY DISAGREEMENTS (for human review):", partyMismatch);
  show("NOT FOUND IN REFERENCE:", notFound);

  if (!APPLY) { console.log("\nDry run — pass --apply to record the corroboration."); return; }

  // Only rows that agree on all three fields get marked, each with its source.
  let written = 0;
  for (let i = 0; i < matched.length; i += 50) {
    const chunk = matched.slice(i, i + 50);
    await db.$transaction(
      chunk.flatMap((m) => [
        db.candidate.update({
          where: { id: m.id },
          data: { verificationStatus: "VERIFIED", verifiedAt: new Date() },
        }),
        db.candidateSource.create({
          data: {
            candidateId: m.id,
            field: "constituency+party",
            label: REFERENCE_NAME,
            url: REFERENCE_URL,
            note: "Name, constituency and party agree with the published member list for the 2026 general election. Secondary source: not yet confirmed against the Election Commission's own record.",
          },
        }),
      ])
    );
    written += chunk.length;
    process.stdout.write(`\r  recorded ${written}/${matched.length}   `);
  }
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
