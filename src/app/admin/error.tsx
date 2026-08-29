"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Keeps an admin-side failure inside the admin shell rather than blanking it. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[netatrack:admin] unhandled error", error);
  }, [error]);

  return (
    <div className="card" style={{ maxWidth: "560px" }}>
      <h2>This screen didn&apos;t load</h2>
      <p className="muted">
        The operation was not applied. Retry, or return to the dashboard and check the
        audit log to confirm the current state before trying again.
      </p>
      <div className="row" style={{ gap: ".5rem" }}>
        <button className="btn btn-sm" onClick={reset}>
          Try again
        </button>
        <Link href="/admin" className="btn btn-sm btn-ghost">
          Dashboard
        </Link>
      </div>
      {error.digest ? (
        <p className="small faint" style={{ marginTop: ".8rem", marginBottom: 0 }}>
          Reference <code className="mono">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
