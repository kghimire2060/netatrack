"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

/**
 * Profile-scoped error boundary.
 *
 * Deliberately not a `loading.tsx`: a route-level loading file streams the
 * shell before the page runs, which turns this segment's `notFound()` into a
 * 200. An error boundary has no such effect, so the 404 path stays intact.
 */
export default function CandidateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error("candidate profile error", error);
  }, [error]);

  return (
    <div className="wrap section">
      <div className="empty" role="alert">
        <span className="icon" aria-hidden>
          !
        </span>
        <strong>{t("cand.errorTitle")}</strong>
        <p className="small muted" style={{ marginTop: ".3rem" }}>
          {t("cand.errorHint")}
        </p>
        {error.digest ? <p className="small faint">Reference: {error.digest}</p> : null}
        <div className="row" style={{ gap: ".6rem", marginTop: ".9rem", justifyContent: "center" }}>
          <button type="button" className="btn btn-sm" onClick={reset}>
            {t("cand.retry")}
          </button>
          <Link className="btn btn-sm btn-ghost" href="/candidates">
            {t("cand.title")}
          </Link>
        </div>
      </div>
    </div>
  );
}
