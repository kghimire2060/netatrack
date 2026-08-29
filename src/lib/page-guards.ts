import { redirect } from "next/navigation";
import { getActor, type Actor } from "./auth";

/**
 * Page-level authentication guard.
 *
 * Server Components render concurrently with their layout, so a page that
 * throws while the layout is redirecting produces a spurious unhandled error in
 * the log. Redirecting here instead keeps the outcome identical and the log
 * clean. This is convenience only — API routes still use `requireActor`, which
 * throws, because a request with no session must fail rather than redirect.
 */
export async function requireActorPage(next: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}`);
  return actor;
}
