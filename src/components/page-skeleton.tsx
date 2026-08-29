import { Card } from "./ui";

/**
 * Route-level loading placeholder.
 *
 * Only mount this via a `loading.tsx` in a segment that cannot call
 * `notFound()`. Streaming flushes the response shell early, which locks the
 * status at 200 — so a segment that may 404 must not stream, or crawlers and
 * uptime checks will see a missing record as a success.
 */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="wrap section">
      <div className="skeleton-line" style={{ width: "38%", height: "2rem" }} />
      <div className="skeleton-line" style={{ width: "60%" }} />
      <div className="grid grid-3" style={{ marginTop: "1.4rem" }}>
        {Array.from({ length: cards }, (_, index) => (
          <Card key={index}>
            <div className="skeleton-line" style={{ width: "55%", height: "1.2rem" }} />
            <div className="skeleton-line" />
            <div className="skeleton-line" style={{ width: "80%" }} />
          </Card>
        ))}
      </div>
      <span className="visually-hidden" role="status">
        Loading
      </span>
    </div>
  );
}
