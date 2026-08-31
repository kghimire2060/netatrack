import { NextResponse } from "next/server";
import { drainMailQueue } from "@/lib/mail-queue";

/**
 * Scheduled mail delivery, called by Vercel Cron (see vercel.json).
 *
 * Authorisation: Vercel signs cron requests with `Authorization: Bearer
 * $CRON_SECRET`. The check is mandatory in production — an unauthenticated
 * drain endpoint lets anyone force the queue and probe delivery state. When
 * CRON_SECRET is unset the route refuses in production rather than defaulting
 * open, and stays available locally so the schedule can be exercised.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const production = process.env.NODE_ENV === "production";

  if (production) {
    if (!secret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 503 }
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await drainMailQueue();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    // Never leak credentials or message contents into the response.
    console.error("[cron:mail] drain failed", error);
    return NextResponse.json({ ok: false, error: "drain failed" }, { status: 500 });
  }
}
