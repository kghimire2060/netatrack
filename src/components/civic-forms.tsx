"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormError, FormSuccess, formValues, useApiForm } from "./form-kit";
import { RATING_DIMENSIONS } from "@/lib/ratings";

// ------------------------------ report an issue -----------------------------

export function ReportIssueForm({
  categories,
  signedIn,
  constituencies,
}: {
  categories: string[];
  signedIn: boolean;
  constituencies: { id: string; name: string; district: string }[];
}) {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const form = useApiForm<{ trackingId: string }>({
    url: "/api/complaints",
    onSuccess: (data) => setTrackingId(data.trackingId),
    refresh: false,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      ...values,
      constituencyId: values.constituencyId || null,
      contactEmail: values.contactEmail || null,
      province: values.province || null,
      district: values.district || null,
      locationDetail: values.locationDetail || null,
    });
  }

  if (trackingId) {
    return (
      <div className="stack">
        <div className="alert alert-success">
          <strong>Your issue has been submitted.</strong>
          <p style={{ margin: ".4rem 0 0" }}>
            Save this tracking ID — it is how you follow progress, and it works without logging in.
          </p>
        </div>
        <div className="card center">
          <div className="label">Your tracking ID</div>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: ".04em" }}>
            {trackingId}
          </div>
        </div>
        <Link href={`/track?id=${trackingId}`} className="btn btn-block">
          Track this issue
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <Field label="Issue title" name="title" required>
        <input id="title" name="title" required maxLength={160} placeholder="Street light out on Ward 4 main road" />
      </Field>
      <Field label="Description" name="description" required hint="Include what, where and since when. Do not include other people's personal details.">
        <textarea id="description" name="description" required minLength={20} maxLength={5000} />
      </Field>
      <div className="grid grid-2">
        <Field label="Category" name="category" required>
          <select id="category" name="category" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority" name="priority">
          <select id="priority" name="priority" defaultValue="NORMAL">
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-2">
        <Field label="Province" name="province">
          <input id="province" name="province" maxLength={80} />
        </Field>
        <Field label="District" name="district">
          <input id="district" name="district" maxLength={80} />
        </Field>
      </div>
      <Field label="Constituency" name="constituencyId" hint="Optional — helps route the issue to the right team.">
        <select id="constituencyId" name="constituencyId" defaultValue="">
          <option value="">Not sure</option>
          {constituencies.map((constituency) => (
            <option key={constituency.id} value={constituency.id}>
              {constituency.name} ({constituency.district})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Location detail" name="locationDetail" hint="Landmark, ward number or street.">
        <input id="locationDetail" name="locationDetail" maxLength={300} />
      </Field>
      {!signedIn ? (
        <Field
          label="Contact email"
          name="contactEmail"
          hint="Optional. Used only to send you status updates — it is never shown publicly."
        >
          <input id="contactEmail" name="contactEmail" type="email" />
        </Field>
      ) : null}
      <div className="notice notice-blue">
        Your name and contact details are never shown on the public tracking page. Only the issue
        summary, status and official responses are public.
      </div>
      <button className="btn btn-block" disabled={form.pending}>
        {form.pending ? "Submitting…" : "Submit issue"}
      </button>
    </form>
  );
}

// -------------------------------- track lookup -------------------------------

export function TrackLookup({ initial }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = value.trim().toUpperCase();
    if (id) router.push(`/track?id=${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".5rem" }}>
      <input
        aria-label="Tracking ID"
        className="grow mono"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="NT-ISSUE-00000001"
        style={{ minWidth: "220px" }}
      />
      <button className="btn">Track</button>
    </form>
  );
}

// ------------------------------ citizen feedback ------------------------------

export function ComplaintFeedbackForm({ trackingId }: { trackingId: string }) {
  const form = useApiForm({
    url: "/api/complaints/feedback",
    successMessage: "Thank you — your feedback has been recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      trackingId,
      feedback: values.feedback || null,
      rating: values.rating ? Number(values.rating) : null,
      requestReopen: values.requestReopen === "on",
    });
  }

  if (form.success) return <FormSuccess message={form.success} />;

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <Field label="How satisfied are you with the resolution?" name="rating">
        <select id="rating" name="rating" defaultValue="">
          <option value="">No answer</option>
          <option value="5">5 — Very satisfied</option>
          <option value="4">4 — Satisfied</option>
          <option value="3">3 — Neutral</option>
          <option value="2">2 — Dissatisfied</option>
          <option value="1">1 — Very dissatisfied</option>
        </select>
      </Field>
      <Field label="Comments" name="feedback">
        <textarea id="feedback" name="feedback" maxLength={2000} style={{ minHeight: "80px" }} />
      </Field>
      <label className="row small">
        <input type="checkbox" name="requestReopen" />
        <span>This issue is not resolved — please reopen it.</span>
      </label>
      <button className="btn btn-sm" disabled={form.pending}>
        {form.pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}

// -------------------------------- rating form --------------------------------

export function RatingForm({
  candidateId,
  existing,
}: {
  candidateId: string;
  existing?: Record<string, number> | null;
}) {
  const form = useApiForm({
    url: "/api/ratings",
    successMessage: "Your rating has been recorded. You can update it at any time.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    const payload: Record<string, unknown> = { candidateId, comment: values.comment || null };
    for (const dimension of RATING_DIMENSIONS) {
      payload[dimension.key] = Number(values[dimension.key]);
    }
    void form.submit(payload);
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      {RATING_DIMENSIONS.map((dimension) => (
        <div className="field" key={dimension.key}>
          <label htmlFor={dimension.key}>
            {dimension.label}{" "}
            <span className="faint small">({Math.round(dimension.weight * 100)}% weight)</span>
          </label>
          <select
            id={dimension.key}
            name={dimension.key}
            defaultValue={String(existing?.[dimension.key] ?? 3)}
          >
            {[1, 2, 3, 4, 5].map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
          <div className="help">{dimension.purpose}</div>
        </div>
      ))}
      <Field label="Comment" name="comment" hint="Optional. Abusive or fraudulent ratings are removed by moderators.">
        <textarea id="comment" name="comment" maxLength={1000} style={{ minHeight: "80px" }} />
      </Field>
      <div className="notice">
        Ratings are public-opinion indicators, not voting recommendations, and are kept entirely
        separate from official election results.
      </div>
      <button className="btn" disabled={form.pending}>
        {form.pending ? "Saving…" : existing ? "Update my rating" : "Submit rating"}
      </button>
    </form>
  );
}

// --------------------------------- poll vote ----------------------------------

export function PollVoteForm({
  pollId,
  options,
  votedOptionId,
}: {
  pollId: string;
  options: { id: string; label: string; count: number }[];
  votedOptionId?: string | null;
}) {
  const form = useApiForm({ url: `/api/polls/${pollId}/vote`, successMessage: "Vote recorded." });
  const total = options.reduce((sum, option) => sum + option.count, 0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    if (!values.optionId) return;
    void form.submit({ optionId: values.optionId });
  }

  if (votedOptionId || form.success) {
    return (
      <div className="stack">
        {form.success ? <FormSuccess message={form.success} /> : null}
        {options.map((option) => {
          const pct = total === 0 ? 0 : Math.round((option.count / total) * 100);
          return (
            <div key={option.id} className="bar-row">
              <span>{option.label}</span>
              <span className="meter">
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="small muted">{pct}%</span>
            </div>
          );
        })}
        <p className="small faint">{total.toLocaleString()} responses</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      {options.map((option) => (
        <label key={option.id} className="row">
          <input type="radio" name="optionId" value={option.id} required />
          <span>{option.label}</span>
        </label>
      ))}
      <button className="btn btn-sm" disabled={form.pending}>
        {form.pending ? "Submitting…" : "Vote"}
      </button>
    </form>
  );
}

// ------------------------------ candidate claim -------------------------------

export function CandidateClaimForm({ candidates }: { candidates: { id: string; fullName: string }[] }) {
  const form = useApiForm({
    url: "/api/candidates/claims",
    successMessage:
      "Claim submitted. Staff will review your evidence and an administrator will approve or reject it.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({ ...values, evidenceUrl: values.evidenceUrl || null });
  }

  if (form.success) return <FormSuccess message={form.success} />;

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <Field label="Candidate profile" name="candidateId" required>
        <select id="candidateId" name="candidateId" required defaultValue="">
          <option value="" disabled>
            Select your profile
          </option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.fullName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Evidence URL" name="evidenceUrl" hint="A link to an official page, nomination record or verified social account.">
        <input id="evidenceUrl" name="evidenceUrl" type="url" />
      </Field>
      <Field label="Statement" name="statement" required hint="Explain who you are and how the reviewer can confirm your identity.">
        <textarea id="statement" name="statement" required minLength={20} maxLength={2000} />
      </Field>
      <div className="notice">
        An approved claim lets you edit permitted profile fields only. Independent fact-checks,
        official results, editorial ratings and verification records remain editorially controlled.
      </div>
      <button className="btn" disabled={form.pending}>
        {form.pending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}

// --------------------------- candidate self-edit ------------------------------

export function CandidateSelfEditForm({
  candidate,
}: {
  candidate: {
    id: string;
    biography: string | null;
    education: string | null;
    experience: string | null;
    previousPositions: string | null;
    agenda: string | null;
    keyIssues: string | null;
    photoUrl: string | null;
  };
}) {
  const form = useApiForm({
    url: `/api/candidates/${candidate.id}/self`,
    method: "PATCH",
    successMessage: "Profile updated. The change has been recorded in the audit log.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      biography: values.biography || null,
      education: values.education || null,
      experience: values.experience || null,
      previousPositions: values.previousPositions || null,
      agenda: values.agenda || null,
      keyIssues: values.keyIssues || null,
      photoUrl: values.photoUrl || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <Field label="Photo URL" name="photoUrl">
        <input id="photoUrl" name="photoUrl" type="url" defaultValue={candidate.photoUrl ?? ""} />
      </Field>
      <Field label="Biography" name="biography">
        <textarea id="biography" name="biography" defaultValue={candidate.biography ?? ""} />
      </Field>
      <Field label="Education" name="education">
        <textarea id="education" name="education" defaultValue={candidate.education ?? ""} style={{ minHeight: "70px" }} />
      </Field>
      <Field label="Professional experience" name="experience">
        <textarea id="experience" name="experience" defaultValue={candidate.experience ?? ""} style={{ minHeight: "70px" }} />
      </Field>
      <Field label="Previous public positions" name="previousPositions">
        <textarea id="previousPositions" name="previousPositions" defaultValue={candidate.previousPositions ?? ""} style={{ minHeight: "70px" }} />
      </Field>
      <Field label="Public agenda" name="agenda">
        <textarea id="agenda" name="agenda" defaultValue={candidate.agenda ?? ""} />
      </Field>
      <Field label="Key issues" name="keyIssues" hint="Comma separated.">
        <input id="keyIssues" name="keyIssues" defaultValue={candidate.keyIssues ?? ""} />
      </Field>
      <button className="btn" disabled={form.pending}>
        {form.pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

// ------------------------------ compare picker --------------------------------

export function ComparePicker({
  candidates,
  constituency,
  selected,
}: {
  candidates: { id: string; fullName: string; party: string }[];
  constituency: string;
  selected: string[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(selected);

  function toggle(id: string) {
    setPicked((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : previous.length >= 4
          ? previous
          : [...previous, id]
    );
  }

  function compare() {
    const params = new URLSearchParams({ constituency, ids: picked.join(",") });
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <div className="stack" style={{ marginTop: "1rem" }}>
      <fieldset>
        <legend>Select up to four candidates ({picked.length}/4)</legend>
        <div className="grid grid-2">
          {candidates.map((candidate) => (
            <label key={candidate.id} className="row small">
              <input
                type="checkbox"
                checked={picked.includes(candidate.id)}
                disabled={!picked.includes(candidate.id) && picked.length >= 4}
                onChange={() => toggle(candidate.id)}
              />
              <span>
                {candidate.fullName} <span className="faint">({candidate.party})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-sm" onClick={compare} disabled={picked.length < 2}>
        Compare {picked.length > 1 ? `${picked.length} candidates` : "(pick at least two)"}
      </button>
    </div>
  );
}
