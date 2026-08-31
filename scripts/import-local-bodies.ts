/**
 * Imports Nepal's 753 local bodies (स्थानीय तह) as level = LOCAL rows.
 *
 *   npx tsx scripts/import-local-bodies.ts <cities.wiki> <gaunpalika.wiki>
 *   npx tsx scripts/import-local-bodies.ts <cities.wiki> <gaunpalika.wiki> --apply
 *
 * Two published tables are parsed. Their column order is NOT the same — the
 * urban list is District then Province, the rural list is Province then
 * District — so each table gets its own explicit mapping. Swapping those two
 * silently would misfile 460 rows, which is exactly the class of error this
 * project has already been bitten by, so the parse is validated before a
 * single row is written:
 *
 *   - counts must be 6 metropolitan, 11 sub-metropolitan, 276 municipality,
 *     460 rural municipality = 753
 *   - every district must already exist in our 77
 *   - every province must already exist in our 7
 *
 * If any check fails the import aborts rather than writing partial data.
 */
import { PrismaClient, type LocalBodyType } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const [CITIES, GAUN] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const SOURCES: Record<LocalBodyType, { name: string; url: string }> = {
  METROPOLITAN: { name: "List of cities in Nepal", url: "https://en.wikipedia.org/wiki/List_of_cities_in_Nepal" },
  SUB_METROPOLITAN: { name: "List of cities in Nepal", url: "https://en.wikipedia.org/wiki/List_of_cities_in_Nepal" },
  MUNICIPALITY: { name: "List of cities in Nepal", url: "https://en.wikipedia.org/wiki/List_of_cities_in_Nepal" },
  RURAL_MUNICIPALITY: { name: "List of gaunpalikas of Nepal", url: "https://en.wikipedia.org/wiki/List_of_gaunpalikas_of_Nepal" },
};

const EXPECTED: Record<LocalBodyType, number> = {
  METROPOLITAN: 6,
  SUB_METROPOLITAN: 11,
  MUNICIPALITY: 276,
  RURAL_MUNICIPALITY: 460,
};

type Row = {
  name: string; nameNe: string | null; district: string; province: string;
  population: number | null; areaSqKm: number | null; wards: number | null;
  type: LocalBodyType;
};

const strip = (c: string) =>
  c.replace(/\{\{[^{}]*\}\}/g, "")
   .replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>.*?<\/ref>/gs, "")
   .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
   .replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, "$1")
   .replace(/<[^>]+>/g, "").replace(/'''?/g, "").replace(/&nbsp;/g, " ")
   .trim();

const num = (c: string) => {
  const m = strip(c).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const int = (c: string) => { const n = num(c); return n === null ? null : Math.round(n); };

/** District/province cells often carry the word itself; drop it for matching. */
const place = (c: string) => strip(c).replace(/\s+(District|Province)$/i, "").trim();

/**
 * District names differ between the published lists and our records. These are
 * naming or transliteration variants of the same district, not different
 * places. The riskiest pair is Nawalparasi: the old district was split into
 * Nawalpur (east, Gandaki) and Parasi (west, Lumbini), so "Nawalparasi West"
 * maps to Parasi and emphatically not to Nawalpur. The province-consistency
 * check below exists to catch precisely that kind of mistake.
 */
const DISTRICT_ALIASES: Record<string, string> = {
  makawanpur: "Makwanpur",
  pancthar: "Panchthar",        // misspelling in the source table
  dhanusa: "Dhanusha",
  terathum: "Terhathum",
  "eastern rukum": "Rukum East",
  "western rukum": "Rukum West",
  "nawalparasi west": "Parasi",
  "nawalparasi east": "Nawalpur",
};

const canonDistrict = (d: string) => DISTRICT_ALIASES[d.toLowerCase()] ?? d;

/**
 * Reads one wikitable starting at `fromLine`, returning its data rows as
 * arrays of raw cells. Cells may be on their own line or `||`-joined.
 */
function readTable(lines: string[], fromLine: number): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let started = false;
  for (let i = fromLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("{|")) { started = true; continue; }
    if (!started) continue;
    if (line.startsWith("|}")) { if (cur.length) rows.push(cur); break; }
    if (line.startsWith("!")) continue;                       // header
    if (line.startsWith("|-")) { if (cur.length) rows.push(cur); cur = []; continue; }
    if (line.startsWith("|")) { cur.push(...line.slice(1).split("||")); continue; }
    if (cur.length) cur[cur.length - 1] += " " + line;         // wrapped cell
  }
  return rows.filter((r) => r.length >= 6);
}

function sectionLine(lines: string[], heading: string) {
  const i = lines.findIndex((l) => l.trim().toLowerCase() === heading.toLowerCase());
  if (i === -1) throw new Error(`section not found: ${heading}`);
  return i;
}

function parseUrban(text: string, heading: string, type: LocalBodyType): Row[] {
  const lines = text.split("\n");
  // urban columns: Name | Nepali | District | Province | Population | Area | Wards | Website
  return readTable(lines, sectionLine(lines, heading)).map((c) => ({
    name: strip(c[0]), nameNe: strip(c[1]) || null,
    district: canonDistrict(place(c[2])), province: place(c[3]),
    population: int(c[4]), areaSqKm: num(c[5]), wards: int(c[6]),
    type,
  })).filter((r) => r.name);
}

function parseRural(text: string): Row[] {
  const lines = text.split("\n");
  // rural columns: Name | Nepali | Province | District | Population | Area | Wards
  //                              ^^^^^^^^^^^^^^^^^^^^ order is reversed here
  return readTable(lines, sectionLine(lines, "== Rural Municipality==")).map((c) => ({
    name: strip(c[0]), nameNe: strip(c[1]) || null,
    province: place(c[2]), district: canonDistrict(place(c[3])),
    population: int(c[4]), areaSqKm: num(c[5]), wards: int(c[6]),
    type: "RURAL_MUNICIPALITY" as LocalBodyType,
  })).filter((r) => r.name);
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

async function main() {
  if (!CITIES || !GAUN) throw new Error("Usage: import-local-bodies.ts <cities.wiki> <gaunpalika.wiki>");
  const cities = readFileSync(CITIES, "utf8");
  const rows = [
    ...parseUrban(cities, "=== Metropolitan cities ===", "METROPOLITAN"),
    ...parseUrban(cities, "=== Sub-metropolitan cities ===", "SUB_METROPOLITAN"),
    ...parseUrban(cities, "=== Municipality ===", "MUNICIPALITY"),
    ...parseRural(readFileSync(GAUN, "utf8")),
  ];

  // ---- validation gate ----------------------------------------------------
  const problems: string[] = [];
  const counts = {} as Record<LocalBodyType, number>;
  for (const r of rows) counts[r.type] = (counts[r.type] ?? 0) + 1;
  console.log("parsed:");
  for (const [type, want] of Object.entries(EXPECTED) as [LocalBodyType, number][]) {
    const got = counts[type] ?? 0;
    console.log(`  ${type.padEnd(20)} ${String(got).padStart(3)} (expected ${want})${got === want ? "" : "  <-- MISMATCH"}`);
    if (got !== want) problems.push(`${type}: parsed ${got}, expected ${want}`);
  }
  console.log(`  ${"TOTAL".padEnd(20)} ${String(rows.length).padStart(3)} (expected 753)`);
  if (rows.length !== 753) problems.push(`total ${rows.length}, expected 753`);

  const known = await db.constituency.findMany({
    where: { level: { in: ["FEDERAL", "PROVINCIAL"] } },
    distinct: ["district"],
    select: { district: true, province: true },
  });
  const districtProvince = new Map(known.map((k) => [k.district.toLowerCase(), k.province]));
  const provinces = new Set(known.map((k) => k.province.toLowerCase()));

  const badDistrict = [...new Set(rows.filter((r) => !districtProvince.has(r.district.toLowerCase())).map((r) => r.district))];
  const badProvince = [...new Set(rows.filter((r) => !provinces.has(r.province.toLowerCase())).map((r) => r.province))];
  if (badDistrict.length) problems.push(`unknown districts (${badDistrict.length}): ${badDistrict.slice(0, 12).join(", ")}`);
  if (badProvince.length) problems.push(`unknown provinces (${badProvince.length}): ${badProvince.join(", ")}`);

  /**
   * Province is derived from the district rather than taken from the list.
   * We already hold an authoritative district -> province mapping for all 77
   * districts, built from the federal seats. That removes a whole class of
   * error, and turns the list's own province cell into a cross-check: where
   * the two disagree the row is quarantined, not silently rewritten.
   */
  const districtCase = new Map(known.map((k) => [k.district.toLowerCase(), k.district]));
  const quarantined: { row: Row; why: string }[] = [];
  const importable: Row[] = [];

  for (const r of rows) {
    const ourProvince = districtProvince.get(r.district.toLowerCase());
    if (!ourProvince) continue; // already reported as an unknown district
    if (ourProvince.toLowerCase() !== r.province.toLowerCase()) {
      quarantined.push({
        row: r,
        why: `list says province "${r.province}" but ${r.district} district is in "${ourProvince}"`,
      });
      continue;
    }
    r.province = ourProvince;                                   // our casing
    r.district = districtCase.get(r.district.toLowerCase()) ?? r.district;
    importable.push(r);
  }

  if (problems.length > 0) {
    console.log("\nVALIDATION FAILED — nothing written:");
    problems.forEach((p) => console.log("  - " + p));
    process.exitCode = 1;
    return;
  }
  console.log("\nvalidation passed: counts, 77 districts and 7 provinces all reconcile.");
  if (quarantined.length > 0) {
    console.log(`\nQUARANTINED ${quarantined.length} row(s) — not imported, for human review:`);
    quarantined.forEach((q) => console.log(`  - ${q.row.name} (${q.row.type}): ${q.why}`));
  }
  console.log(`\nimportable: ${importable.length} of ${rows.length}`);

  if (!APPLY) { console.log("Dry run — pass --apply to write."); return; }

  let n = 0;
  for (let i = 0; i < importable.length; i += 50) {
    const chunk = importable.slice(i, i + 50);
    await db.$transaction(chunk.map((r) => {
      const slug = `${slugify(r.name)}-${slugify(r.district)}`;
      const src = SOURCES[r.type];
      const data = {
        name: r.name, nameNe: r.nameNe, province: r.province, district: r.district,
        level: "LOCAL" as const, localBodyType: r.type,
        wards: r.wards, population: r.population, areaSqKm: r.areaSqKm,
        sourceName: src.name, sourceUrl: src.url,
      };
      return db.constituency.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    }));
    n += chunk.length;
    process.stdout.write(`\r  written ${n}/${importable.length}   `);
  }
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
