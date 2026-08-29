import { randomBytes } from "crypto";
import { prisma } from "./db";

/**
 * Public complaint Tracking ID (section 8).
 *
 * The database primary key stays an internal UUID; this is a separate unique
 * field, so the public identifier leaks no row-count information beyond the
 * sequence itself and stays stable if storage changes.
 *
 * Format: NT-ISSUE-00018452 (padded sequence, unique-constraint safe).
 */
const PREFIX = "NT-ISSUE-";
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // no I, L, O, U

export async function generateTrackingId(): Promise<string> {
  // Take the highest existing sequence rather than a row count, so deletions
  // can never cause a collision.
  const latest = await prisma.complaint.findFirst({
    where: { trackingId: { startsWith: PREFIX } },
    orderBy: { trackingId: "desc" },
    select: { trackingId: true },
  });

  let next = 1;
  if (latest) {
    const parsed = Number.parseInt(latest.trackingId.slice(PREFIX.length), 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${PREFIX}${String(next + attempt).padStart(8, "0")}`;
    const clash = await prisma.complaint.findUnique({
      where: { trackingId: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }

  // Fall back to the date+random form also allowed by the proposal.
  return dateFormTrackingId();
}

/** Alternate documented form: NT-2026-08-29-7F4K2P */
export function dateFormTrackingId(now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const bytes = randomBytes(6);
  let suffix = "";
  for (const byte of bytes) suffix += CROCKFORD[byte % CROCKFORD.length];
  return `NT-${date}-${suffix}`;
}

/**
 * Accepted public tracking IDs:
 *   NT-ISSUE-00000001        current sequence
 *   NT-2026-08-29-7F4K2P     date + random form
 *   NT-LEGACY-00001          imported from the previous system
 */
const TRACKING_RE =
  /^NT-(ISSUE-\d{8}|LEGACY-\d{5}|\d{4}-\d{2}-\d{2}-[0-9A-HJKMNP-TV-Z]{6})$/;

export function isValidTrackingId(value: string) {
  return TRACKING_RE.test(value.trim().toUpperCase());
}

export function normalizeTrackingId(value: string) {
  return value.trim().toUpperCase();
}

/** Human-readable reference for candidate claims: NT-CLAIM-XXXXXX */
export function claimReference(): string {
  const bytes = randomBytes(6);
  let suffix = "";
  for (const byte of bytes) suffix += CROCKFORD[byte % CROCKFORD.length];
  return `NT-CLAIM-${suffix}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
