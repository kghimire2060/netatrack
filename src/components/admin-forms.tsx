"use client";

import { useState, type FormEvent } from "react";
import { Field, FormError, FormSuccess, formValues, useApiForm } from "./form-kit";
import { humanize } from "@/lib/format";

// ---------------------- complaint lifecycle action panel ---------------------

export function ComplaintActionPanel({
  complaintId,
  currentStatus,
  transitions,
  staff,
  assignedToId,
  department,
}: {
  complaintId: string;
  currentStatus: string;
  transitions: string[];
  staff: { id: string; fullName: string; role: string }[];
  assignedToId: string | null;
  department: string | null;
}) {
  const [status, setStatus] = useState(transitions[0] ?? currentStatus);
  const form = useApiForm({
    url: `/api/admin/complaints/${complaintId}/transition`,
    method: "PATCH",
    successMessage: "Issue updated and the reporter notified where applicable.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      publicUpdate: values.publicUpdate || null,
      internalNote: values.internalNote || null,
      assignedToId: values.assignedToId || null,
      department: values.department || null,
      resolutionNote: values.resolutionNote || null,
      expectedUpdateAt: values.expectedUpdateAt
        ? new Date(values.expectedUpdateAt).toISOString()
        : null,
      priority: values.priority || undefined,
    });
  }

  if (transitions.length === 0) {
    return <p className="small muted">No further transitions are available from this state.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />

      <Field label="Move to status" name="status" required>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {transitions.map((option) => (
            <option key={option} value={option}>
              {humanize(option)}
            </option>
          ))}
        </select>
      </Field>

      {status === "ASSIGNED" ? (
        <>
          <Field label="Assign to" name="assignedToId" required>
            <select id="assignedToId" name="assignedToId" defaultValue={assignedToId ?? ""} required>
              <option value="" disabled>
                Choose a staff member
              </option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} ({humanize(member.role)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department / team" name="department">
            <input id="department" name="department" defaultValue={department ?? ""} maxLength={120} />
          </Field>
        </>
      ) : null}

      {status === "RESOLVED" ? (
        <Field
          label="Resolution note"
          name="resolutionNote"
          required
          hint="Required. Attach resolution evidence as an attachment where available."
        >
          <textarea id="resolutionNote" name="resolutionNote" required style={{ minHeight: "80px" }} />
        </Field>
      ) : null}

      <Field
        label="Public update"
        name="publicUpdate"
        hint="Shown to the citizen on the public tracking page and included in the notification email."
      >
        <textarea id="publicUpdate" name="publicUpdate" style={{ minHeight: "70px" }} maxLength={2000} />
      </Field>

      <Field label="Internal note" name="internalNote" hint="Never shown publicly. Visible to staff only.">
        <textarea id="internalNote" name="internalNote" style={{ minHeight: "60px" }} maxLength={4000} />
      </Field>

      <div className="grid grid-2">
        <Field label="Next expected update" name="expectedUpdateAt">
          <input id="expectedUpdateAt" name="expectedUpdateAt" type="datetime-local" />
        </Field>
        <Field label="Priority" name="priority">
          <select id="priority" name="priority" defaultValue="">
            <option value="">Unchanged</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
      </div>

      <button className="btn" disabled={form.pending}>
        {form.pending ? "Saving…" : "Apply update"}
      </button>
    </form>
  );
}

// ------------------------------ user administration ---------------------------

export function UserAdminForm({
  userId,
  role,
  status,
  researcherApproved,
  canAssignRole,
  assignableRoles,
}: {
  userId: string;
  role: string;
  status: string;
  researcherApproved: boolean;
  canAssignRole: boolean;
  assignableRoles: string[];
}) {
  const form = useApiForm({
    url: `/api/admin/users/${userId}`,
    method: "PATCH",
    successMessage: "User updated.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      role: canAssignRole ? values.role : undefined,
      researcherApproved: values.researcherApproved === "on",
      reason: values.reason || undefined,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <div className="grid grid-2">
        <Field label="Account status" name="status">
          <select id="status" name="status" defaultValue={status}>
            {["PENDING", "ACTIVE", "SUSPENDED", "LOCKED", "DELETED"].map((option) => (
              <option key={option} value={option}>
                {humanize(option)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Role" name="role" hint={canAssignRole ? undefined : "You cannot change roles."}>
          <select id="role" name="role" defaultValue={role} disabled={!canAssignRole}>
            {assignableRoles.map((option) => (
              <option key={option} value={option}>
                {humanize(option)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="row small">
        <input type="checkbox" name="researcherApproved" defaultChecked={researcherApproved} />
        <span>Approved researcher (grants dataset and export access)</span>
      </label>
      <Field label="Reason" name="reason" hint="Recorded in the audit log.">
        <input id="reason" name="reason" maxLength={500} />
      </Field>
      <button className="btn btn-sm" disabled={form.pending}>
        {form.pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

// ------------------------------- role permissions ------------------------------

export function RolePermissionEditor({
  role,
  granted,
  catalog,
  lockedPermissions,
}: {
  role: string;
  granted: string[];
  catalog: { key: string; description: string }[];
  lockedPermissions: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(granted));
  const form = useApiForm({
    url: `/api/admin/roles/${role}`,
    method: "PATCH",
    successMessage: "Permissions updated. The change takes effect immediately.",
  });

  function toggle(key: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit({ permissions: [...selected] });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <div className="grid grid-2">
        {catalog.map((permission) => {
          const locked = lockedPermissions.includes(permission.key) && role !== "SUPER_ADMIN";
          return (
            <label
              key={permission.key}
              className="row small"
              style={{ alignItems: "flex-start", opacity: locked ? 0.5 : 1 }}
            >
              <input
                type="checkbox"
                checked={selected.has(permission.key)}
                disabled={locked || role === "SUPER_ADMIN"}
                onChange={() => toggle(permission.key)}
              />
              <span>
                <code className="mono">{permission.key}</code>
                <br />
                <span className="faint">{permission.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <button className="btn btn-sm" disabled={form.pending || role === "SUPER_ADMIN"}>
        {role === "SUPER_ADMIN" ? "Super Admin always holds every permission" : form.pending ? "Saving…" : "Save permissions"}
      </button>
    </form>
  );
}

// ------------------------------- settings editor -------------------------------

export function SettingsForm({ values }: { values: Record<string, unknown> }) {
  const form = useApiForm({
    url: "/api/admin/settings",
    method: "PATCH",
    successMessage: "Settings saved.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = formValues(event);
    void form.submit({
      "brand.tagline": raw.tagline,
      "brand.supportEmail": raw.supportEmail,
      "content.neutralityNotice": raw.neutralityNotice,
      "complaints.categories": raw.categories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      "complaints.slaHours": Number(raw.slaHours),
      "complaints.allowAnonymous": raw.allowAnonymous === "on",
      "ratings.enabled": raw.ratingsEnabled === "on",
      "features.researcherPortal": raw.researcherPortal === "on",
      "features.publicPolls": raw.publicPolls === "on",
    });
  }

  const categories = (values["complaints.categories"] as string[] | undefined) ?? [];

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <Field label="Brand tagline" name="tagline">
        <input id="tagline" name="tagline" defaultValue={String(values["brand.tagline"] ?? "")} />
      </Field>
      <Field label="Support email" name="supportEmail">
        <input id="supportEmail" name="supportEmail" type="email" defaultValue={String(values["brand.supportEmail"] ?? "")} />
      </Field>
      <Field label="Neutrality notice" name="neutralityNotice" hint="Shown in the footer of every transactional email.">
        <textarea id="neutralityNotice" name="neutralityNotice" defaultValue={String(values["content.neutralityNotice"] ?? "")} style={{ minHeight: "70px" }} />
      </Field>
      <Field label="Complaint categories" name="categories" hint="Comma separated.">
        <textarea id="categories" name="categories" defaultValue={categories.join(", ")} style={{ minHeight: "60px" }} />
      </Field>
      <Field label="Response SLA (hours)" name="slaHours">
        <input id="slaHours" name="slaHours" type="number" min={1} defaultValue={String(values["complaints.slaHours"] ?? 72)} />
      </Field>
      <fieldset>
        <legend>Feature flags</legend>
        <label className="row small">
          <input type="checkbox" name="allowAnonymous" defaultChecked={Boolean(values["complaints.allowAnonymous"])} />
          <span>Allow anonymous issue reports</span>
        </label>
        <label className="row small">
          <input type="checkbox" name="ratingsEnabled" defaultChecked={Boolean(values["ratings.enabled"])} />
          <span>Candidate ratings enabled</span>
        </label>
        <label className="row small">
          <input type="checkbox" name="publicPolls" defaultChecked={Boolean(values["features.publicPolls"])} />
          <span>Public opinion polls enabled</span>
        </label>
        <label className="row small">
          <input type="checkbox" name="researcherPortal" defaultChecked={Boolean(values["features.researcherPortal"])} />
          <span>Researcher portal enabled</span>
        </label>
      </fieldset>
      <button className="btn btn-sm" disabled={form.pending}>
        {form.pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

// ------------------------------ SMTP test sender -------------------------------

export function SmtpTestForm({ defaultTo }: { defaultTo: string }) {
  const form = useApiForm<{ delivered: boolean; dev: boolean }>({
    url: "/api/admin/notifications/test",
    successMessage: "Test message queued. Check the delivery log below for the result.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(formValues(event));
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <Field label="Send test email to" name="to" required>
        <input id="to" name="to" type="email" defaultValue={defaultTo} required />
      </Field>
      <button className="btn btn-sm btn-ghost" disabled={form.pending}>
        {form.pending ? "Sending…" : "Send test email"}
      </button>
    </form>
  );
}

// ----------------------------- editorial publishing ----------------------------

export function ModerationForm({
  ratingId,
  currentStatus,
}: {
  ratingId: string;
  currentStatus: string;
}) {
  const form = useApiForm({
    url: `/api/admin/ratings/${ratingId}`,
    method: "PATCH",
    successMessage: "Moderation decision recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(formValues(event));
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select name="status" defaultValue={currentStatus} aria-label="Moderation status">
        {["VISIBLE", "FLAGGED", "HIDDEN", "REMOVED"].map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
      <input name="moderationNote" placeholder="Reason (recorded)" aria-label="Moderation reason" />
      <button className="btn btn-sm btn-ghost" disabled={form.pending}>
        Save
      </button>
      {form.error ? <span className="small" style={{ color: "var(--red)" }}>{form.error}</span> : null}
    </form>
  );
}

// ------------------------------ claim review ----------------------------------

export function ClaimReviewForm({ claimId }: { claimId: string }) {
  const form = useApiForm({
    url: `/api/admin/claims/${claimId}`,
    method: "PATCH",
    successMessage: "Decision recorded and the requester notified.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({ status: values.status, reviewNote: values.reviewNote || null });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <div className="row" style={{ gap: ".5rem" }}>
        <select name="status" defaultValue="UNDER_REVIEW" aria-label="Decision">
          <option value="UNDER_REVIEW">Mark under review</option>
          <option value="APPROVED">Approve claim</option>
          <option value="REJECTED">Reject claim</option>
        </select>
        <input name="reviewNote" placeholder="Review note (sent to the requester)" className="grow" />
        <button className="btn btn-sm" disabled={form.pending}>
          {form.pending ? "Saving…" : "Record decision"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------- candidate verification ---------------------------

export function CandidateVerifyForm({ candidateId }: { candidateId: string }) {
  const form = useApiForm({
    url: `/api/admin/candidates/${candidateId}/verify`,
    successMessage: "Verification decision recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      sourceLabel: values.sourceLabel || null,
      sourceUrl: values.sourceUrl || null,
      note: values.note || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <div className="row" style={{ gap: ".4rem" }}>
        <select name="status" defaultValue="VERIFIED" aria-label="Verification decision">
          <option value="VERIFIED">Verify</option>
          <option value="PENDING">Back to pending</option>
          <option value="REJECTED">Reject</option>
        </select>
        <input name="sourceLabel" placeholder="Source label" />
        <input name="sourceUrl" type="url" placeholder="Source URL" className="grow" />
        <button className="btn btn-sm" disabled={form.pending}>
          Record
        </button>
      </div>
    </form>
  );
}

// ------------------------------- result publish --------------------------------

export function ResultPublishForm({
  resultId,
  sourceName,
  sourceUrl,
}: {
  resultId: string;
  sourceName: string | null;
  sourceUrl: string | null;
}) {
  const form = useApiForm({
    url: `/api/admin/results/${resultId}/publish`,
    successMessage: "Result updated.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      sourceName: values.sourceName || null,
      sourceUrl: values.sourceUrl || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select name="status" defaultValue="VERIFIED" aria-label="Result status">
        <option value="VERIFIED">Verify and publish</option>
        <option value="PENDING">Unpublish</option>
        <option value="REJECTED">Reject</option>
      </select>
      <input name="sourceName" defaultValue={sourceName ?? ""} placeholder="Source name" />
      <input name="sourceUrl" type="url" defaultValue={sourceUrl ?? ""} placeholder="Source URL" />
      <button className="btn btn-sm" disabled={form.pending}>
        Save
      </button>
      {form.error ? <span className="small" style={{ color: "var(--red)" }}>{form.error}</span> : null}
      {form.success ? <span className="small" style={{ color: "var(--green)" }}>Saved</span> : null}
    </form>
  );
}

// ----------------------------- editorial workflow -------------------------------

export function NewsWorkflowForm({
  articleId,
  status,
  canPublish,
}: {
  articleId: string;
  status: string;
  canPublish: boolean;
}) {
  const [next, setNext] = useState(status);
  const form = useApiForm({
    url: `/api/admin/news/${articleId}`,
    method: "PATCH",
    successMessage: "Article updated.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      correctionSummary: values.correctionSummary || null,
    });
  }

  const stages = ["DRAFT", "EDITORIAL_REVIEW", "SOURCE_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"];

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select
        name="status"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        aria-label="Editorial stage"
      >
        {stages.map((stage) => (
          <option
            key={stage}
            value={stage}
            disabled={!canPublish && (stage === "PUBLISHED" || stage === "APPROVED")}
          >
            {humanize(stage)}
          </option>
        ))}
      </select>
      {status === "PUBLISHED" ? (
        <input name="correctionSummary" placeholder="Correction summary (required after publication)" className="grow" />
      ) : null}
      <button className="btn btn-sm" disabled={form.pending}>
        Apply
      </button>
      {form.error ? <span className="small" style={{ color: "var(--red)" }}>{form.error}</span> : null}
      {form.success ? <span className="small" style={{ color: "var(--green)" }}>Saved</span> : null}
    </form>
  );
}

export function FactCheckReviewForm({
  factCheckId,
  verdict,
  status,
  canPublish,
}: {
  factCheckId: string;
  verdict: string;
  status: string;
  canPublish: boolean;
}) {
  const form = useApiForm({
    url: `/api/admin/fact-checks/${factCheckId}`,
    method: "PATCH",
    successMessage: "Fact check updated.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({ verdict: values.verdict, status: values.status });
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select name="verdict" defaultValue={verdict} aria-label="Verdict">
        {["TRUE", "MOSTLY_TRUE", "MISLEADING", "FALSE", "UNVERIFIED", "INSUFFICIENT_EVIDENCE"].map(
          (option) => (
            <option key={option} value={option}>
              {humanize(option)}
            </option>
          )
        )}
      </select>
      <select name="status" defaultValue={status} aria-label="Stage">
        {["DRAFT", "EDITORIAL_REVIEW", "SOURCE_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"].map(
          (option) => (
            <option
              key={option}
              value={option}
              disabled={!canPublish && (option === "PUBLISHED" || option === "APPROVED")}
            >
              {humanize(option)}
            </option>
          )
        )}
      </select>
      <button className="btn btn-sm" disabled={form.pending}>
        Save
      </button>
      {form.error ? <span className="small" style={{ color: "var(--red)" }}>{form.error}</span> : null}
      {form.success ? <span className="small" style={{ color: "var(--green)" }}>Saved</span> : null}
    </form>
  );
}

export function PromiseUpdateForm({ promiseId, status }: { promiseId: string; status: string }) {
  const form = useApiForm({
    url: `/api/admin/promises/${promiseId}`,
    successMessage: "Progress recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      note: values.note || null,
      evidenceUrl: values.evidenceUrl || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select name="status" defaultValue={status} aria-label="Promise status">
        {["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "DELAYED", "CANCELLED", "UNABLE_TO_VERIFY"].map(
          (option) => (
            <option key={option} value={option}>
              {humanize(option)}
            </option>
          )
        )}
      </select>
      <input name="evidenceUrl" type="url" placeholder="Evidence URL" />
      <input name="note" placeholder="Progress note" className="grow" />
      <button className="btn btn-sm" disabled={form.pending}>
        Update
      </button>
      {form.error ? <span className="small" style={{ color: "var(--red)" }}>{form.error}</span> : null}
      {form.success ? <span className="small" style={{ color: "var(--green)" }}>Saved</span> : null}
    </form>
  );
}
