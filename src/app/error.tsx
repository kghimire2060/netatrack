"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Root error boundary. Shows a recovery path rather than a stack trace: the
 * message from a server exception can carry internal detail, so it is never
 * rendered. The digest is safe to show and is what ties a user report to the
 * server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[netatrack] unhandled error", error);
  }, [error]);

  return (
    <div className="wrap section" style={{ maxWidth: "640px" }}>
      <p className="mono small faint" style={{ letterSpacing: ".14em" }}>
        SOMETHING WENT WRONG
      </p>
      <h1>This page didn&apos;t load</h1>
      <p className="muted">
        The problem is on our side, not yours. Nothing you submitted has been lost —
        issues, ratings and account changes are only saved once they are confirmed.
      </p>

      <div className="card">
        <div className="row" style={{ gap: ".5rem" }}>
          <button className="btn" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go to the home page
          </Link>
        </div>
        {error.digest ? (
          <p className="small faint" style={{ marginTop: ".9rem", marginBottom: 0 }}>
            If you report this, quote reference{" "}
            <code className="mono">{error.digest}</code>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
