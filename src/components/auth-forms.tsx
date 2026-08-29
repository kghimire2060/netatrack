"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Field, FormError, FormSuccess, formValues, useApiForm } from "./form-kit";

export function LoginForm({ next }: { next?: string }) {
  const [mfaRequired, setMfaRequired] = useState(false);
  const form = useApiForm<{ ok: boolean; mfaRequired?: boolean; role?: string }>({
    url: "/api/auth/login",
    onSuccess: (data) => {
      if (data.mfaRequired) {
        setMfaRequired(true);
        return;
      }
      window.location.href = next ?? (isStaff(data.role) ? "/admin" : "/account");
    },
    refresh: false,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(formValues(event));
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      {mfaRequired ? (
        <div className="alert">Enter the 6-digit code from your authenticator app.</div>
      ) : null}
      <Field label="Email address" name="email" required>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" name="password" required>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {mfaRequired ? (
        <Field label="Authentication code" name="mfaCode" required>
          <input id="mfaCode" name="mfaCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
        </Field>
      ) : null}
      <button className="btn btn-block" disabled={form.pending}>
        {form.pending ? "Signing in…" : "Log in"}
      </button>
      <div className="row-between small">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/register">Create an account</Link>
      </div>
    </form>
  );
}

function isStaff(role?: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF";
}

export function RegisterForm() {
  const form = useApiForm({
    url: "/api/auth/register",
    successMessage:
      "Account created. Check your email for a verification link — the account activates once verified.",
    refresh: false,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(formValues(event));
  }

  if (form.success) return <FormSuccess message={form.success} />;

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <Field label="Full name" name="fullName" required>
        <input id="fullName" name="fullName" required autoComplete="name" />
      </Field>
      <Field label="Email address" name="email" required>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field
        label="Password"
        name="password"
        required
        hint="At least 10 characters with upper case, lower case and a digit."
      >
        <input id="password" name="password" type="password" required autoComplete="new-password" />
      </Field>
      <p className="small muted">
        By registering you agree to the <Link href="/terms">terms of use</Link> and{" "}
        <Link href="/privacy">privacy policy</Link>. Your email is never shown publicly.
      </p>
      <button className="btn btn-block" disabled={form.pending}>
        {form.pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const form = useApiForm({
    url: "/api/auth/forgot-password",
    successMessage:
      "If that email is registered, a reset link is on its way. The link expires in 60 minutes.",
    refresh: false,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(formValues(event));
  }

  if (form.success) return <FormSuccess message={form.success} />;

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <Field label="Email address" name="email" required>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <button className="btn btn-block" disabled={form.pending}>
        {form.pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const form = useApiForm({
    url: "/api/auth/reset-password",
    successMessage: "Password updated. All other sessions were signed out. You can log in now.",
    refresh: false,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit({ ...formValues(event), token });
  }

  if (form.success)
    return (
      <div className="stack">
        <FormSuccess message={form.success} />
        <Link className="btn btn-block" href="/login">
          Go to login
        </Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <Field label="New password" name="password" required hint="At least 10 characters with upper case, lower case and a digit.">
        <input id="password" name="password" type="password" required autoComplete="new-password" />
      </Field>
      <button className="btn btn-block" disabled={form.pending}>
        {form.pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
