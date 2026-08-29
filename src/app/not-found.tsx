import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata = { title: "Page not found" };

/**
 * Branded 404. Replaces the framework default so a mistyped URL still looks
 * like NetaTrack and offers a route onward — including the tracking lookup,
 * which is the most common reason someone arrives at an unknown URL.
 */
export default function NotFound() {
  return (
    <div className="wrap section" style={{ maxWidth: "640px" }}>
      <p className="mono small faint" style={{ letterSpacing: ".14em" }}>
        ERROR 404
      </p>
      <h1>We couldn&apos;t find that page</h1>
      <p className="muted">
        The link may be out of date, or the page may have moved. Nothing is wrong with
        your account.
      </p>

      <Card title="Where would you like to go?">
        <div className="stack">
          <Link href="/" className="btn btn-block">
            Back to the home page
          </Link>
          <div className="grid grid-2">
            <Link href="/candidates" className="btn btn-ghost">
              Candidates
            </Link>
            <Link href="/results" className="btn btn-ghost">
              Election results
            </Link>
            <Link href="/track" className="btn btn-ghost">
              Track an issue
            </Link>
            <Link href="/report" className="btn btn-ghost">
              Report an issue
            </Link>
          </div>
        </div>
      </Card>

      <div className="notice notice-blue" style={{ marginTop: "1rem" }}>
        Looking for an issue you reported? A tracking ID such as{" "}
        <code className="mono">NT-ISSUE-00000001</code> works on the{" "}
        <Link href="/track">tracking page</Link> or in the search box above — you do not
        need an account.
      </div>
    </div>
  );
}
