"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Small client-side form helper. It only handles presentation and the fetch;
 * all validation that matters is repeated on the server.
 */

export type ApiIssue = { path: string; message: string };

export function useApiForm<T = unknown>(options: {
  url: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  onSuccess?: (data: T) => void;
  redirectTo?: string;
  refresh?: boolean;
  successMessage?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(payload: unknown) {
    setPending(true);
    setError(null);
    setIssues([]);
    setSuccess(null);
    try {
      const response = await fetch(options.url, {
        method: options.method ?? "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Request failed");
        setIssues(data.issues ?? []);
        return null;
      }
      if (options.successMessage) setSuccess(options.successMessage);
      options.onSuccess?.(data as T);
      if (options.redirectTo) router.push(options.redirectTo);
      if (options.refresh !== false) router.refresh();
      return data as T;
    } catch {
      setError("Network error. Please try again.");
      return null;
    } finally {
      setPending(false);
    }
  }

  return { submit, pending, error, issues, success, setError, setSuccess };
}

export function FormError({ error, issues }: { error: string | null; issues?: ApiIssue[] }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      <strong>{error}</strong>
      {issues && issues.length > 0 ? (
        <ul style={{ margin: ".4rem 0 0", paddingLeft: "1.1rem" }}>
          {issues.map((issue) => (
            <li key={`${issue.path}-${issue.message}`}>
              {issue.path ? <strong>{issue.path}: </strong> : null}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-success" role="status">
      {message}
    </div>
  );
}

export function Field({
  label,
  name,
  hint,
  children,
  required,
}: {
  label: string;
  name?: string;
  hint?: ReactNode;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required ? <span style={{ color: "var(--red)" }}> *</span> : null}
      </label>
      {children}
      {hint ? <div className="help">{hint}</div> : null}
    </div>
  );
}

/** Collects a <form> into a plain object, dropping empty optional strings. */
export function formValues(event: FormEvent<HTMLFormElement>): Record<string, string> {
  const data = new FormData(event.currentTarget);
  const out: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** One-click server action button (assign to me, approve, publish…). */
export function ActionButton({
  url,
  method = "POST",
  body,
  label,
  confirm,
  className = "btn btn-sm",
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button className={className} onClick={run} disabled={pending}>
        {pending ? "Working…" : label}
      </button>
      {error ? (
        <span className="small" style={{ color: "var(--red)", marginLeft: ".4rem" }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
