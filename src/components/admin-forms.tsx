"use client";

import { useState, type FormEvent } from "react";
import { Field, FormError, FormSuccess, formValues, useApiForm } from "./form-kit";
import { enumLabel } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

// ---------------------- complaint lifecycle action panel ---------------------

export function ComplaintActionPanel({
  complaintId,
  currentStatus,
  transitions,
  staff,
  assignedToId,
  department,
  representatives,
  representativeId,
}: {
  complaintId: string;
  currentStatus: string;
  transitions: string[];
  staff: { id: string; fullName: string; role: string }[];
  assignedToId: string | null;
  department: string | null;
  representatives: { id: string; label: string }[];
  representativeId: string | null;
}) {
  const { locale, t } = useLocale();
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
      representativeId: values.representativeId || null,
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

      <Field label={t("adm.moveTo")} name="status" required>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {transitions.map((option) => (
            <option key={option} value={option}>
              {enumLabel(option, locale)}
            </option>
          ))}
        </select>
      </Field>

      {status === "ASSIGNED" ? (
        <>
          <Field label={t("adm.assignTo")} name="assignedToId" required>
            <select id="assignedToId" name="assignedToId" defaultValue={assignedToId ?? ""} required>
              <option value="" disabled>
                Choose a staff member
              </option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} ({enumLabel(member.role, locale)})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("adm.department")} name="department">
            <input id="department" name="department" defaultValue={department ?? ""} maxLength={120} />
          </Field>
        </>
      ) : null}

      {status === "RESOLVED" ? (
        <Field
          label={t("adm.resolutionNote")}
          name="resolutionNote"
          required
          hint="Required. Attach resolution evidence as an attachment where available."
        >
          <textarea id="resolutionNote" name="resolutionNote" required style={{ minHeight: "80px" }} />
        </Field>
      ) : null}

      {/* Routing publishes this issue on a politician's public profile, so the
          hint says exactly what selecting a name does — and clearing it
          un-routes the issue rather than leaving it published. */}
      <Field
        label="File with a representative"
        name="representativeId"
        hint="Publishes this issue on that politician's profile once it is past verification. Leave blank, or clear it, if the issue concerns a department rather than a person."
      >
        <select id="representativeId" name="representativeId" defaultValue={representativeId ?? ""}>
          <option value="">Not filed with a representative</option>
          {representatives.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label={t("adm.publicUpdate")}
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
        <Field label={t("adm.priority")} name="priority">
          <select id="priority" name="priority" defaultValue="">
            <option value="">{t("adm.unchanged")}</option>
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
  const { locale, t } = useLocale();
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
        <Field label={t("adm.accountStatus")} name="status">
          <select id="status" name="status" defaultValue={status}>
            {["PENDING", "ACTIVE", "SUSPENDED", "LOCKED", "DELETED"].map((option) => (
              <option key={option} value={option}>
                {enumLabel(option, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Role" name="role" hint={canAssignRole ? undefined : "You cannot change roles."}>
          <select id="role" name="role" defaultValue={role} disabled={!canAssignRole}>
            {assignableRoles.map((option) => (
              <option key={option} value={option}>
                {enumLabel(option, locale)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="row small">
        <input type="checkbox" name="researcherApproved" defaultChecked={researcherApproved} />
        <span>Approved researcher (grants dataset and export access)</span>
      </label>
      <Field label={t("adm.reason")} name="reason">
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
  const { locale, t } = useLocale();
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
  const { locale, t } = useLocale();
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
  const { locale, t } = useLocale();
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
  const { locale, t } = useLocale();
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
            {enumLabel(option, locale)}
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
  const { locale, t } = useLocale();
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
  const { locale, t } = useLocale();
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
  const { locale, t } = useLocale();
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
  const { locale, t } = useLocale();
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
            {enumLabel(stage, locale)}
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
  const { locale, t } = useLocale();
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
              {enumLabel(option, locale)}
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
              {enumLabel(option, locale)}
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
  const { locale, t } = useLocale();
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
              {enumLabel(option, locale)}
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

// -------------------- constituency projects, statements, media ---------------

const PROJECT_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "STALLED",
  "CANCELLED",
  "UNABLE_TO_VERIFY",
];

/** Numeric field value, or null when the editor left it blank. */
function num(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProjectCreateForm({
  constituencies,
  candidates,
}: {
  constituencies: { id: string; name: string; district: string }[];
  candidates: { id: string; fullName: string }[];
}) {
  const { locale } = useLocale();
  const form = useApiForm({
    url: "/api/admin/projects",
    successMessage: "Project recorded. It stays unverified until checked against its source.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      title: values.title,
      titleNe: values.titleNe || null,
      description: values.description || null,
      sector: values.sector || null,
      status: values.status,
      progressPct: num(values.progressPct),
      budgetNpr: num(values.budgetNpr),
      spentNpr: num(values.spentNpr),
      startedAt: values.startedAt || null,
      targetDate: values.targetDate || null,
      completedAt: values.completedAt || null,
      wardNumber: num(values.wardNumber),
      locationDetail: values.locationDetail || null,
      implementingBody: values.implementingBody || null,
      constituencyId: values.constituencyId,
      candidateId: values.candidateId || null,
      sourceName: values.sourceName || null,
      sourceUrl: values.sourceUrl || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />

      <div className="grid grid-2">
        <Field label="Project title" name="title" required>
          <input id="title" name="title" required minLength={6} maxLength={240} />
        </Field>
        <Field label="Title in Nepali" name="titleNe">
          <input id="titleNe" name="titleNe" maxLength={240} />
        </Field>
      </div>

      <Field label="Description" name="description">
        <textarea id="description" name="description" maxLength={4000} style={{ minHeight: "70px" }} />
      </Field>

      <div className="grid grid-2">
        <Field label="Constituency" name="constituencyId" required>
          <select id="constituencyId" name="constituencyId" required defaultValue="">
            <option value="" disabled>
              Choose a constituency
            </option>
            {constituencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.district}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Credited representative"
          name="candidateId"
          hint="Leave blank unless a source actually credits this politician with the work."
        >
          <select id="candidateId" name="candidateId" defaultValue="">
            <option value="">Not attributed</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-3">
        <Field label="Status" name="status" required>
          <select id="status" name="status" defaultValue="PROPOSED">
            {PROJECT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {enumLabel(option, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Published progress %"
          name="progressPct"
          hint="Only if the implementing body published a figure. Leave blank otherwise."
        >
          <input id="progressPct" name="progressPct" type="number" min={0} max={100} step="0.1" />
        </Field>
        <Field label="Sector" name="sector">
          <input id="sector" name="sector" maxLength={80} placeholder="Road, Health, Education…" />
        </Field>
      </div>

      <div className="grid grid-2">
        <Field label="Allocated (NPR)" name="budgetNpr">
          <input id="budgetNpr" name="budgetNpr" type="number" min={0} step="0.01" />
        </Field>
        <Field label="Spent (NPR)" name="spentNpr">
          <input id="spentNpr" name="spentNpr" type="number" min={0} step="0.01" />
        </Field>
      </div>

      <div className="grid grid-3">
        <Field label="Started" name="startedAt">
          <input id="startedAt" name="startedAt" type="date" />
        </Field>
        <Field label="Target date" name="targetDate">
          <input id="targetDate" name="targetDate" type="date" />
        </Field>
        <Field label="Completed" name="completedAt">
          <input id="completedAt" name="completedAt" type="date" />
        </Field>
      </div>

      <div className="grid grid-3">
        <Field label="Ward" name="wardNumber">
          <input id="wardNumber" name="wardNumber" type="number" min={1} max={99} />
        </Field>
        <Field label="Location detail" name="locationDetail">
          <input id="locationDetail" name="locationDetail" maxLength={240} />
        </Field>
        <Field label="Implementing body" name="implementingBody">
          <input id="implementingBody" name="implementingBody" maxLength={200} />
        </Field>
      </div>

      <div className="grid grid-2">
        <Field label="Source name" name="sourceName" hint="Required to record a project as completed.">
          <input id="sourceName" name="sourceName" maxLength={200} />
        </Field>
        <Field label="Source URL" name="sourceUrl">
          <input id="sourceUrl" name="sourceUrl" type="url" maxLength={500} />
        </Field>
      </div>

      <button className="btn" disabled={form.pending}>
        {form.pending ? "Saving…" : "Record project"}
      </button>
    </form>
  );
}

export function ProjectUpdateForm({ projectId, status }: { projectId: string; status: string }) {
  const { locale } = useLocale();
  const form = useApiForm({
    url: `/api/admin/projects/${projectId}`,
    successMessage: "Progress recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      status: values.status,
      progressPct: num(values.progressPct),
      note: values.note || null,
      evidenceUrl: values.evidenceUrl || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select name="status" defaultValue={status} aria-label="Project status">
        {PROJECT_STATUSES.map((option) => (
          <option key={option} value={option}>
            {enumLabel(option, locale)}
          </option>
        ))}
      </select>
      <input
        name="progressPct"
        type="number"
        min={0}
        max={100}
        step="0.1"
        placeholder="Progress %"
        style={{ width: "7rem" }}
        aria-label="Published progress percent"
      />
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

export function StatementCreateForm({
  candidates,
}: {
  candidates: { id: string; fullName: string }[];
}) {
  const { locale } = useLocale();
  const [publish, setPublish] = useState(false);
  const form = useApiForm({
    url: "/api/admin/statements",
    successMessage: "Statement recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      candidateId: values.candidateId,
      quote: values.quote,
      quoteNe: values.quoteNe || null,
      context: values.context,
      venue: values.venue || null,
      statedAt: values.statedAt || null,
      topic: values.topic || null,
      sourceName: values.sourceName || null,
      sourceUrl: values.sourceUrl || null,
      publish,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />

      <Field label="Politician" name="candidateId" required>
        <select id="candidateId" name="candidateId" required defaultValue="">
          <option value="" disabled>
            Choose a politician
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Quote"
        name="quote"
        required
        hint="Verbatim, in the language it was given in. Never a paraphrase."
      >
        <textarea id="quote" name="quote" required minLength={20} maxLength={4000} style={{ minHeight: "90px" }} />
      </Field>

      <Field label="Original in Nepali" name="quoteNe" hint="Where the record above is a translation.">
        <textarea id="quoteNe" name="quoteNe" maxLength={4000} style={{ minHeight: "70px" }} />
      </Field>

      <div className="grid grid-3">
        <Field label="Context" name="context" required>
          <select id="context" name="context" defaultValue="PRESS_CONFERENCE">
            {[
              "PARLIAMENT",
              "PRESS_CONFERENCE",
              "INTERVIEW",
              "SOCIAL_MEDIA",
              "CAMPAIGN_RALLY",
              "PARTY_EVENT",
              "OFFICIAL_DOCUMENT",
              "OTHER",
            ].map((option) => (
              <option key={option} value={option}>
                {enumLabel(option, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date stated" name="statedAt">
          <input id="statedAt" name="statedAt" type="date" />
        </Field>
        <Field label="Topic" name="topic">
          <input id="topic" name="topic" maxLength={80} />
        </Field>
      </div>

      <Field label="Venue" name="venue">
        <input id="venue" name="venue" maxLength={240} placeholder="House of Representatives, session 12" />
      </Field>

      <div className="grid grid-2">
        <Field label="Source name" name="sourceName" hint="Required to publish.">
          <input id="sourceName" name="sourceName" maxLength={200} />
        </Field>
        <Field label="Source URL" name="sourceUrl">
          <input id="sourceUrl" name="sourceUrl" type="url" maxLength={500} />
        </Field>
      </div>

      <label className="row" style={{ gap: ".4rem" }}>
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        <span className="small">Publish immediately (requires a source)</span>
      </label>

      <button className="btn" disabled={form.pending}>
        {form.pending ? "Saving…" : "Record statement"}
      </button>
    </form>
  );
}

export function MediaCreateForm({
  candidates,
  projects,
}: {
  candidates: { id: string; fullName: string }[];
  projects: { id: string; title: string }[];
}) {
  const { locale } = useLocale();
  const [publish, setPublish] = useState(false);
  const form = useApiForm({
    url: "/api/admin/media",
    successMessage: "Photograph recorded.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      candidateId: values.candidateId || null,
      projectId: values.projectId || null,
      kind: values.kind,
      imageUrl: values.imageUrl,
      thumbnailUrl: values.thumbnailUrl || null,
      caption: values.caption || null,
      captionNe: values.captionNe || null,
      altText: values.altText || null,
      capturedAt: values.capturedAt || null,
      credit: values.credit || null,
      sourceUrl: values.sourceUrl || null,
      position: num(values.position) ?? 0,
      publish,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />

      <div className="grid grid-2">
        <Field label="Politician" name="candidateId" hint="Attach to a politician, a project, or both.">
          <select id="candidateId" name="candidateId" defaultValue="">
            <option value="">Not attached</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project" name="projectId">
          <select id="projectId" name="projectId" defaultValue="">
            <option value="">Not attached</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-2">
        <Field label="Image URL" name="imageUrl" required>
          <input id="imageUrl" name="imageUrl" type="url" required maxLength={500} />
        </Field>
        <Field label="Thumbnail URL" name="thumbnailUrl">
          <input id="thumbnailUrl" name="thumbnailUrl" type="url" maxLength={500} />
        </Field>
      </div>

      <Field
        label="Alt text"
        name="altText"
        hint="Required to publish. Describes what the photograph shows, for readers using a screen reader."
      >
        <input id="altText" name="altText" maxLength={300} />
      </Field>

      <div className="grid grid-2">
        <Field label="Caption" name="caption">
          <input id="caption" name="caption" maxLength={400} />
        </Field>
        <Field label="Caption in Nepali" name="captionNe">
          <input id="captionNe" name="captionNe" maxLength={400} />
        </Field>
      </div>

      <div className="grid grid-3">
        <Field label="Kind" name="kind" required>
          <select id="kind" name="kind" defaultValue="PROJECT_EVIDENCE">
            {[
              "PROJECT_EVIDENCE",
              "CONSTITUENCY_VISIT",
              "PARLIAMENT",
              "PUBLIC_EVENT",
              "DOCUMENT_SCAN",
              "OTHER",
            ].map((option) => (
              <option key={option} value={option}>
                {enumLabel(option, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Date taken"
          name="capturedAt"
          hint="When the photograph was taken, not when it was uploaded. Leave blank if unknown."
        >
          <input id="capturedAt" name="capturedAt" type="date" />
        </Field>
        <Field label="Order" name="position">
          <input id="position" name="position" type="number" min={0} max={999} defaultValue={0} />
        </Field>
      </div>

      <div className="grid grid-2">
        <Field label="Credit" name="credit" hint="Required to publish. Photographer or outlet.">
          <input id="credit" name="credit" maxLength={160} />
        </Field>
        <Field label="Source URL" name="sourceUrl">
          <input id="sourceUrl" name="sourceUrl" type="url" maxLength={500} />
        </Field>
      </div>

      <label className="row" style={{ gap: ".4rem" }}>
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        <span className="small">Publish immediately (requires alt text and a credit)</span>
      </label>

      <button className="btn" disabled={form.pending}>
        {form.pending ? "Saving…" : "Record photograph"}
      </button>
    </form>
  );
}

/** Publish / archive control shared by statements and photographs. */
export function ContentStatusForm({
  url,
  status,
  label,
}: {
  url: string;
  status: string;
  label: string;
}) {
  const { locale } = useLocale();
  const form = useApiForm({ url, method: "PATCH", successMessage: "Saved." });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({ status: values.status, tier: values.tier || undefined });
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ gap: ".4rem" }}>
      <select name="status" defaultValue={status} aria-label={`${label} status`}>
        {["DRAFT", "PUBLISHED", "ARCHIVED"].map((option) => (
          <option key={option} value={option}>
            {enumLabel(option, locale)}
          </option>
        ))}
      </select>
      <select name="tier" defaultValue="" aria-label="Verification tier">
        <option value="">Tier unchanged</option>
        {["OFFICIAL", "NETATRACK", "UNVERIFIED", "DISPUTED"].map((option) => (
          <option key={option} value={option}>
            {enumLabel(option, locale)}
          </option>
        ))}
      </select>
      <button className="btn btn-sm" disabled={form.pending}>
        Apply
      </button>
      {form.error ? <span className="small" style={{ color: "var(--red)" }}>{form.error}</span> : null}
      {form.success ? <span className="small" style={{ color: "var(--green)" }}>Saved</span> : null}
    </form>
  );
}

/**
 * Editorial identity fields. Deliberately admin-only: a claimed candidate
 * account can edit its biography, but not its recorded name or date of birth.
 */
export function CandidateDetailsForm({
  candidateId,
  fullNameNe,
  dateOfBirth,
  office,
  photoUrl,
}: {
  candidateId: string;
  fullNameNe: string | null;
  dateOfBirth: string | null;
  office: string | null;
  photoUrl: string | null;
}) {
  const form = useApiForm({
    url: `/api/admin/candidates/${candidateId}`,
    method: "PATCH",
    successMessage: "Details saved.",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    void form.submit({
      fullNameNe: values.fullNameNe || null,
      dateOfBirth: values.dateOfBirth || null,
      office: values.office || null,
      photoUrl: values.photoUrl || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <FormError error={form.error} issues={form.issues} />
      <FormSuccess message={form.success} />
      <div className="grid grid-2">
        <Field label="Name in Nepali" name={`ne-${candidateId}`}>
          <input id={`ne-${candidateId}`} name="fullNameNe" defaultValue={fullNameNe ?? ""} maxLength={160} />
        </Field>
        <Field label="Date of birth" name={`dob-${candidateId}`}>
          <input
            id={`dob-${candidateId}`}
            name="dateOfBirth"
            type="date"
            defaultValue={dateOfBirth ?? ""}
          />
        </Field>
        <Field label="Current office" name={`office-${candidateId}`}>
          <input id={`office-${candidateId}`} name="office" defaultValue={office ?? ""} maxLength={160} />
        </Field>
        <Field label="Photo URL" name={`photo-${candidateId}`}>
          <input
            id={`photo-${candidateId}`}
            name="photoUrl"
            type="url"
            defaultValue={photoUrl ?? ""}
            maxLength={500}
          />
        </Field>
      </div>
      <button className="btn btn-sm" disabled={form.pending}>
        {form.pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
