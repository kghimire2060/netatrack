"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Consumes the emailed verification token exactly once on mount. */
export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setState("done");
        } else {
          setState("failed");
          setMessage(data.error ?? "Verification failed");
        }
      })
      .catch(() => {
        setState("failed");
        setMessage("Network error. Please try again.");
      });
  }, [token]);

  if (state === "working") return <p className="small muted">Verifying your account…</p>;

  if (state === "done") {
    return (
      <div className="stack">
        <div className="alert alert-success">
          Your email is verified and your account is now active.
        </div>
        <Link className="btn btn-block" href="/login">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="alert alert-error">{message}</div>
      <p className="small muted">
        Verification links expire after 24 hours and can only be used once. Register again or
        contact support if the problem persists.
      </p>
      <Link className="btn btn-ghost btn-block" href="/register">
        Back to registration
      </Link>
    </div>
  );
}
