import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

/** Runtime configuration an administrator can change without a deploy. */

export const SETTING_DEFAULTS = {
  "brand.tagline": "Know. Vote. Track.",
  "brand.supportEmail": "support@netatrack.example",
  "content.neutralityNotice":
    "NetaTrack is not an election authority. Public-opinion figures are never official results.",
  "complaints.categories": [
    "Infrastructure",
    "Health",
    "Education",
    "Water & Sanitation",
    "Electricity",
    "Corruption",
    "Public Safety",
    "Environment",
    "Local Governance",
    "Other",
  ],
  "complaints.slaHours": 72,
  "complaints.allowAnonymous": true,
  "ratings.enabled": true,
  "ratings.minAccountAgeHours": 0,
  "features.researcherPortal": true,
  "features.publicPolls": true,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

const CACHE_TTL_MS = 30_000;
let cache: { at: number; values: Record<string, unknown> } | null = null;

export async function allSettings(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;

  const values: Record<string, unknown> = { ...SETTING_DEFAULTS };
  try {
    for (const row of await prisma.setting.findMany()) values[row.key] = row.value;
  } catch {
    // Database unavailable — serve compiled defaults.
  }
  cache = { at: Date.now(), values };
  return values;
}

export async function getSetting<K extends SettingKey>(
  key: K
): Promise<(typeof SETTING_DEFAULTS)[K]> {
  const values = await allSettings();
  return (values[key] ?? SETTING_DEFAULTS[key]) as (typeof SETTING_DEFAULTS)[K];
}

export async function setSetting(key: string, value: Prisma.InputJsonValue, category = "general") {
  cache = null;
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, category },
  });
}

export function invalidateSettingsCache() {
  cache = null;
}
