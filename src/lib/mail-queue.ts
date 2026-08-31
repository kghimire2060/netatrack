import { prisma } from "./db";
import { deliver, smtpConfigured } from "./email";

/**
 * Drains queued lifecycle email.
 *
 * Shared by `scripts/mail-worker.ts` (manual or external cron) and the
 * `/api/cron/mail` route that Vercel Cron calls, so there is one delivery
 * path rather than two that can drift apart.
 */
export const MAX_ATTEMPTS = 5;
const BATCH = 50;

export type DrainReport = {
  configured: boolean;
  processed: number;
  sent: number;
  failed: number;
  /** Messages that have exhausted their retries and need a human. */
  stuck: number;
};

export async function drainMailQueue(batch = BATCH): Promise<DrainReport> {
  const configured = smtpConfigured();

  const pending = await prisma.notification.findMany({
    where: {
      channel: "EMAIL",
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
      toEmail: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: batch,
  });

  let sent = 0;
  let failed = 0;

  for (const n of pending) {
    const result = await deliver(n.id, {
      to: n.toEmail!,
      subject: n.subject,
      html: n.body,
      // Plain-text fallback derived from the stored HTML body.
      text: n.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    });
    if (result.delivered || result.dev) sent += 1;
    else failed += 1;
  }

  const stuck = await prisma.notification.count({
    where: { status: "FAILED", attempts: { gte: MAX_ATTEMPTS } },
  });

  return { configured, processed: pending.length, sent, failed, stuck };
}
