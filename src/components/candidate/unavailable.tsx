import type { ReactNode } from "react";
import type { Translator } from "@/lib/i18n";

/**
 * The "we do not have this yet" treatment.
 *
 * Most profiles hold a name, a party and a seat and nothing else, so this
 * state is the common case rather than the exception. It says which record is
 * missing and what would fill it, because a reader who knows *why* a section
 * is empty trusts the sections that are full.
 */
export function Unavailable({
  t,
  title,
  hint,
  action,
}: {
  t: Translator;
  title?: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="unavailable">
      <span className="unavailable-mark" aria-hidden>
        —
      </span>
      <div>
        <strong>{title ?? t("cand.notRecorded")}</strong>
        <p className="small muted">{hint ?? t("cand.notRecordedHint")}</p>
        {action}
      </div>
    </div>
  );
}

/** Inline "not recorded" for a single value inside a table or definition list. */
export function NotRecorded({ t }: { t: Translator }) {
  return <span className="not-recorded">{t("cand.notRecordedShort")}</span>;
}
