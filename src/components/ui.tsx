import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "info" | "good" | "warn" | "bad" | "muted" | "purple" | "navy";

const TONE_CLASS: Record<Tone, string> = {
  info: "badge",
  good: "badge badge-good",
  warn: "badge badge-warn",
  bad: "badge badge-bad",
  muted: "badge badge-muted",
  purple: "badge badge-purple",
  navy: "badge badge-navy",
};

export function Badge({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={TONE_CLASS[tone]}>{children}</span>;
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <div className="card-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "red" | "green" | "orange" | "purple";
}) {
  return (
    <div className={`stat${accent ? ` accent-${accent}` : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "◦",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="icon" aria-hidden>
        {icon}
      </span>
      <strong>{title}</strong>
      {hint ? <p className="small muted" style={{ marginTop: ".3rem" }}>{hint}</p> : null}
      {action ? <div style={{ marginTop: ".8rem" }}>{action}</div> : null}
    </div>
  );
}

export function Meter({
  value,
  max = 100,
  tone,
}: {
  value: number;
  max?: number;
  tone?: "good" | "warn" | "red";
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`meter${tone ? ` ${tone}` : ""}`} role="presentation">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Pager({
  page,
  pages,
  basePath,
  query = {},
}: {
  page: number;
  pages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };
  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const windowEnd = Math.min(pages, windowStart + 4);
  const items: number[] = [];
  for (let i = windowStart; i <= windowEnd; i++) items.push(i);

  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span className="disabled">Previous</span>}
      {items.map((item) =>
        item === page ? (
          <span key={item} className="current" aria-current="page">
            {item}
          </span>
        ) : (
          <Link key={item} href={href(item)}>
            {item}
          </Link>
        )
      )}
      {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span className="disabled">Next</span>}
    </nav>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 ? " / " : ""}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Notice({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "blue" | "purple";
  children: ReactNode;
}) {
  const cls = tone === "warn" ? "notice" : `notice notice-${tone}`;
  return <div className={cls}>{children}</div>;
}

export function Avatar({
  name,
  url,
  large,
}: {
  name: string;
  url?: string | null;
  large?: boolean;
}) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className={`avatar${large ? " avatar-lg" : ""}`} aria-hidden>
      {url ? <img src={url} alt="" /> : letters}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5`}>
      {"★".repeat(Math.max(0, Math.min(5, rounded)))}
      <span style={{ color: "var(--border-strong)" }}>
        {"★".repeat(Math.max(0, 5 - rounded))}
      </span>
    </span>
  );
}
