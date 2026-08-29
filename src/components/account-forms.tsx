"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, FormSuccess, formValues, useApiForm } from "./form-kit";

/** MFA enrolment: request a secret, then prove possession with a live code. */
export function MfaSetup({ enabled, mandatory }: { enabled: boolean; mandatory: boolean }) {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const enable = useApiForm({ url: "/api/auth/mfa/enable", refresh: false });
  const disable = useApiForm({ url: "/api/auth/mfa/disable", refresh: false });

  async function begin() {
    setError(null);
    const response = await fetch("/api/auth/mfa/setup", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not start setup");
      return;
    }
    setSecret(data.secret);
    setOtpauth(data.otpauth);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await enable.submit(formValues(event));
    if (result) {
      setDone(true);
      setSecret(null);
      router.refresh();
    }
  }

  async function turnOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await disable.submit(formValues(event));
    if (result) router.refresh();
  }

  if (enabled && !done) {
    return (
      <div className="stack">
        <div className="alert alert-success">Multi-factor authentication is active.</div>
        {mandatory ? (
          <p className="small muted">
            MFA is mandatory for Super Admin accounts and cannot be turned off.
          </p>
        ) : (
          <form onSubmit={turnOff} className="stack">
            <FormError error={disable.error} issues={disable.issues} />
            <Field label="Confirm your password to disable MFA" name="password" required>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </Field>
            <button className="btn btn-sm btn-danger" disabled={disable.pending}>
              Disable MFA
            </button>
          </form>
        )}
      </div>
    );
  }

  if (done) return <FormSuccess message="Multi-factor authentication is now enabled." />;

  return (
    <div className="stack">
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!secret ? (
        <>
          <p className="small muted">
            Add a time-based code from an authenticator app as a second factor. Strongly recommended
            for any account with administrative access.
          </p>
          <button className="btn btn-sm btn-ghost" onClick={begin}>
            Start setup
          </button>
        </>
      ) : (
        <form onSubmit={confirm} className="stack">
          <FormError error={enable.error} issues={enable.issues} />
          <div className="field">
            <span className="label">1. Add this secret to your authenticator app</span>
            <code
              className="mono"
              style={{ display: "block", padding: ".6rem", background: "#f7faff", borderRadius: "8px", wordBreak: "break-all" }}
            >
              {secret}
            </code>
            {otpauth ? (
              <div className="help" style={{ wordBreak: "break-all" }}>
                Or use this otpauth URL: {otpauth}
              </div>
            ) : null}
          </div>
          <Field label="2. Enter the current 6-digit code" name="code" required>
            <input id="code" name="code" inputMode="numeric" maxLength={6} required autoComplete="one-time-code" />
          </Field>
          <button className="btn btn-sm" disabled={enable.pending}>
            {enable.pending ? "Verifying…" : "Enable MFA"}
          </button>
        </form>
      )}
    </div>
  );
}

/** Revokes every session, including the current one. */
export function RevokeSessionsButton() {
  const [pending, setPending] = useState(false);

  async function run() {
    if (!window.confirm("Sign out of every device, including this one?")) return;
    setPending(true);
    await fetch("/api/auth/logout-all", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button className="btn btn-sm btn-danger" onClick={run} disabled={pending}>
      {pending ? "Signing out…" : "Sign out of all devices"}
    </button>
  );
}

/** Researcher dataset export. Downloads through a POST so the export is logged. */
export function DatasetExport({
  datasets,
}: {
  datasets: { key: string; label: string; description: string; grain: string }[];
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(dataset: string, format: "csv" | "json") {
    setPending(`${dataset}:${format}`);
    setError(null);
    try {
      const response = await fetch("/api/research/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataset, format }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Export failed");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `netatrack-${dataset}.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="stack">
      {error ? <div className="alert alert-error">{error}</div> : null}
      {datasets.map((dataset) => (
        <div key={dataset.key} className="card card-tight">
          <div className="row-between">
            <div className="grow">
              <strong>{dataset.label}</strong>
              <div className="small muted">{dataset.description}</div>
              <div className="small faint">Grain: {dataset.grain}</div>
            </div>
            <div className="row" style={{ gap: ".35rem" }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => download(dataset.key, "csv")}
                disabled={pending !== null}
              >
                {pending === `${dataset.key}:csv` ? "…" : "CSV"}
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => download(dataset.key, "json")}
                disabled={pending !== null}
              >
                {pending === `${dataset.key}:json` ? "…" : "JSON"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
