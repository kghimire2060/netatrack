/**
 * End-to-end mail check.
 *
 * Verifies the SMTP credentials, then queues and delivers one real message
 * through the same path lifecycle email uses — so a pass here means
 * registration and password reset will work, not just that a socket opened.
 *
 *   npx tsx scripts/mail-test.ts you@example.com
 */
import { PrismaClient } from "@prisma/client";
import { queueEmail, verifySmtp, smtpConfigured } from "../src/lib/email";
import { drainMailQueue } from "../src/lib/mail-queue";

const prisma = new PrismaClient();

async function main() {
  const to = process.argv[2];
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    console.error("usage: npx tsx scripts/mail-test.ts you@example.com");
    process.exitCode = 1;
    return;
  }

  if (!smtpConfigured()) {
    console.error("SMTP_HOST is not set. Nothing can be delivered.");
    process.exitCode = 1;
    return;
  }

  console.log("1/3  verifying SMTP connection…");
  const check = await verifySmtp();
  if (!check.ok) {
    // Surfaces the provider's reason (bad auth, wrong port, TLS mismatch)
    // without printing the credentials themselves.
    console.error("     FAILED:", check.reason);
    process.exitCode = 1;
    return;
  }
  console.log("     connection and credentials accepted");

  console.log(`2/3  queueing a test message to ${to}…`);
  await queueEmail({
    to,
    type: "SYSTEM_TEST",
    subject: "NetaTrack mail delivery test",
    html: "<p>Mail delivery is configured correctly.</p><p>Sent by <code>scripts/mail-test.ts</code>.</p>",
    text: "Mail delivery is configured correctly. Sent by scripts/mail-test.ts.",
  });

  console.log("3/3  draining the queue…");
  const report = await drainMailQueue();
  console.log(`     processed ${report.processed}: ${report.sent} sent, ${report.failed} failed`);

  if (report.failed > 0 || report.sent === 0) {
    const last = await prisma.notification.findFirst({
      where: { toEmail: to, type: "SYSTEM_TEST" },
      orderBy: { createdAt: "desc" },
      select: { status: true, error: true, attempts: true },
    });
    console.error("     delivery did not succeed:", last);
    process.exitCode = 1;
    return;
  }

  console.log(`\nSent. Check ${to} (including spam) — if it arrived, registration and password reset work.`);
  if (report.stuck > 0) {
    console.warn(`Note: ${report.stuck} older message(s) have exhausted their retries and need review.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
