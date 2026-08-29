/**
 * Background delivery worker.
 *
 * `queueEmail` attempts immediate delivery; this worker retries anything left
 * in QUEUED or FAILED so a transient SMTP outage never loses a lifecycle
 * notification. Run it on a schedule in production:
 *
 *   npm run mailer
 *
 * A cron entry running it every five minutes is enough for lifecycle email.
 */
import { PrismaClient } from "@prisma/client";
import { deliver } from "../src/lib/email";

const prisma = new PrismaClient();
const MAX_ATTEMPTS = 5;
const BATCH = 50;

async function main() {
  const pending = await prisma.notification.findMany({
    where: {
      channel: "EMAIL",
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
      toEmail: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  if (pending.length === 0) {
    console.log("[mailer] nothing to send");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const notification of pending) {
    const result = await deliver(notification.id, {
      to: notification.toEmail!,
      subject: notification.subject,
      html: notification.body,
      // Plain-text fallback derived from the stored HTML body.
      text: notification.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    });
    if (result.delivered || result.dev) sent += 1;
    else failed += 1;
  }

  console.log(`[mailer] processed ${pending.length}: ${sent} sent, ${failed} failed`);

  const stuck = await prisma.notification.count({
    where: { status: "FAILED", attempts: { gte: MAX_ATTEMPTS } },
  });
  if (stuck > 0) {
    console.warn(`[mailer] ${stuck} message(s) exhausted ${MAX_ATTEMPTS} attempts and need review`);
  }
}

main()
  .catch((error) => {
    console.error("[mailer] failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
