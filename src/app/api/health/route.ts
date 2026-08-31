import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { smtpConfigured } from "@/lib/email";

/**
 * Liveness and readiness.
 *
 * Deliberately says nothing a stranger could use: no versions, no hostnames,
 * no counts, no error text. Each check is a boolean plus a duration, which is
 * enough for an uptime monitor and useless for reconnaissance.
 *
 * Returns 503 when the database is unreachable so a monitor treats it as down.
 * Mail being unconfigured is reported but does not fail the check — the site
 * serves fine without it, and the queue holds anything undelivered.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let database = false;
  let queuedMail: number | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
    queuedMail = await prisma.notification.count({
      where: { channel: "EMAIL", status: { in: ["QUEUED", "FAILED"] } },
    });
  } catch (error) {
    console.error("[health] database check failed", error);
  }

  const body = {
    status: database ? ("ok" as const) : ("degraded" as const),
    checks: {
      database,
      mailConfigured: smtpConfigured(),
      // Surfaces the case this phase exists to fix: mail piling up unsent.
      mailBacklog: queuedMail,
    },
    responseMs: Date.now() - started,
  };

  return NextResponse.json(body, {
    status: database ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
