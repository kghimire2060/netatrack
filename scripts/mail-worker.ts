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
import { drainMailQueue, MAX_ATTEMPTS } from "../src/lib/mail-queue";

const prisma = new PrismaClient();

async function main() {
  const r = await drainMailQueue();
  if (!r.configured) {
    console.warn("[mailer] SMTP is not configured — nothing can be delivered");
  }
  if (r.processed === 0) {
    console.log("[mailer] nothing to send");
  } else {
    console.log(`[mailer] processed ${r.processed}: ${r.sent} sent, ${r.failed} failed`);
  }
  if (r.stuck > 0) {
    console.warn(`[mailer] ${r.stuck} message(s) exhausted ${MAX_ATTEMPTS} attempts and need review`);
  }
}

main()
  .catch((error) => {
    console.error("[mailer] failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
