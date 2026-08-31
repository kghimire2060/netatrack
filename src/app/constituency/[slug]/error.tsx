"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

/**
 * Constituency-scoped error boundary. No `loading.tsx` alongside it: a
 * route-level loading file streams the shell before the page runs, which turns
 * this segment's `notFound()` into a 200.
 */
export default function ConstituencyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error("constituency page error", error);
  }, [error]);

  return (
    <div className="wrap section">
      <div className="empty" role="alert">
        <span className="icon" aria-hidden>
          !
        </span>
        <strong>{t("con.errorTitle")}</strong>
        <p className="small muted" style={{ marginTop: ".3rem" }}>
          {t("con.errorHint")}
        </p>
        {error.digest ? <p className="small faint">Reference: {error.digest}</p> : null}
        <div className="row" style={{ gap: ".6rem", marginTop: ".9rem", justifyContent: "center" }}>
          <button type="button" className="btn btn-sm" onClick={reset}>
            {t("cand.retry")}
          </button>
          <Link className="btn btn-sm btn-ghost" href="/constituencies">
            {t("con.title")}
          </Link>
        </div>
      </div>
    </div>
  );
}
