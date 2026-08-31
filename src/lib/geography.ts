/**
 * Nepal's federal geography.
 *
 * The seven provinces are fixed by the constitution, so their names and
 * numbers are structural facts rather than statistics — they belong in code,
 * the way an enum does. Everything countable (voters, seats, wards) stays in
 * the database.
 *
 * This module exists because `Constituency.province` is stored inconsistently:
 * the seeded database holds "Bagmati" and production holds "bagmati". Grouping
 * or displaying that column raw produces duplicate provinces and lowercase
 * headings, so every read goes through `resolveProvince()`.
 */

export type Province = {
  /** URL segment, e.g. "bagmati". */
  slug: string;
  /** Province number as designated in the constitution. */
  number: number;
  nameEn: string;
  nameNe: string;
  /** Administrative headquarters. */
  capital: string;
};

export const PROVINCES: Province[] = [
  { slug: "koshi", number: 1, nameEn: "Koshi", nameNe: "कोशी", capital: "Biratnagar" },
  { slug: "madhesh", number: 2, nameEn: "Madhesh", nameNe: "मधेश", capital: "Janakpur" },
  { slug: "bagmati", number: 3, nameEn: "Bagmati", nameNe: "बागमती", capital: "Hetauda" },
  { slug: "gandaki", number: 4, nameEn: "Gandaki", nameNe: "गण्डकी", capital: "Pokhara" },
  { slug: "lumbini", number: 5, nameEn: "Lumbini", nameNe: "लुम्बिनी", capital: "Deukhuri" },
  { slug: "karnali", number: 6, nameEn: "Karnali", nameNe: "कर्णाली", capital: "Birendranagar" },
  { slug: "sudurpashchim", number: 7, nameEn: "Sudurpashchim", nameNe: "सुदूरपश्चिम", capital: "Godawari" },
];

/**
 * Spellings seen in the imported data that do not match a slug directly.
 * Kept explicit rather than fuzzy-matched: a near-miss should fail loudly and
 * be added here, not be silently assigned to the wrong province.
 */
const ALIASES: Record<string, string> = {
  "province 1": "koshi",
  "province no. 1": "koshi",
  "province 2": "madhesh",
  madhes: "madhesh",
  madhesh_pradesh: "madhesh",
  "province 3": "bagmati",
  "province 4": "gandaki",
  "province 5": "lumbini",
  "province 6": "karnali",
  "province 7": "sudurpashchim",
  sudurpaschim: "sudurpashchim",
  "far western": "sudurpashchim",
  "sudur pashchim": "sudurpashchim",
};

const BY_SLUG = new Map(PROVINCES.map((p) => [p.slug, p]));

/** Normalise any stored spelling to a canonical province, or null if unknown. */
export function resolveProvince(raw: string | null | undefined): Province | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return BY_SLUG.get(key) ?? BY_SLUG.get(ALIASES[key] ?? "") ?? null;
}

export function provinceName(p: Province | null, locale: "ne" | "en"): string | null {
  if (!p) return null;
  return locale === "ne" ? p.nameNe : p.nameEn;
}

/**
 * A district slug for URLs. Districts are not a fixed list in this codebase —
 * they come from the data — so they are slugified rather than enumerated.
 */
export function districtSlug(district: string): string {
  return district
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
