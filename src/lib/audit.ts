import { prisma } from "./db";
import type { Role } from "@prisma/client";

/**
 * Section 5: "Every privileged action should generate an audit record
 * containing actor, timestamp, action, target entity, result and a safe change
 * summary." The summary is deliberately redacted — no secrets, no raw PII.
 */

const REDACTED_KEYS = [
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "mfasecret",
  "keyhash",
  "internalnotes",
];

export type AuditInput = {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  targetType?: string;
  targetId?: string;
  result?: "SUCCESS" | "DENIED" | "FAILURE";
  changes?: Record<string, unknown>;
  summary?: string;
  ip?: string | null;
  userAgent?: string | null;
};

export async function audit(input: AuditInput) {
  const summary = input.summary ?? (input.changes ? safeSummary(input.changes) : null);
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        result: input.result ?? "SUCCESS",
        changeSummary: summary,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 250) ?? null,
      },
    });
  } catch (error) {
    // Auditing must never break the business action; surface it in logs instead.
    console.error("[audit] failed to write audit record", error);
  }
}

export function safeSummary(changes: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) {
      parts.push(`${key}=[redacted]`);
      continue;
    }
    const rendered =
      value === null || value === undefined
        ? "null"
        : typeof value === "object"
          ? JSON.stringify(value).slice(0, 120)
          : String(value).slice(0, 120);
    parts.push(`${key}=${rendered}`);
  }
  return parts.join("; ").slice(0, 1000);
}
