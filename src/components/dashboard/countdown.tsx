"use client";

import { useEffect, useState } from "react";
import { localizeDigits } from "@/lib/i18n";
import { useLocale } from "../locale-provider";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function split(ms: number): Parts {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/**
 * Live countdown. The target is passed as an ISO string so the server and the
 * first client render agree; the ticking starts after mount, which avoids a
 * hydration mismatch on the seconds digit.
 */
export function ElectionCountdown({
  targetIso,
  labels,
}: {
  targetIso: string;
  labels: { days: string; hours: string; minutes: string; seconds: string; passed: string };
}) {
  const { locale } = useLocale();
  const target = new Date(targetIso).getTime();
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const update = () => setParts(split(target - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  const shown = parts ?? split(target - Date.now());
  const done = target - Date.now() <= 0;

  if (done) {
    return <div className="countdown-passed">{labels.passed}</div>;
  }

  const cells: [number, string][] = [
    [shown.days, labels.days],
    [shown.hours, labels.hours],
    [shown.minutes, labels.minutes],
    [shown.seconds, labels.seconds],
  ];

  return (
    <div className="countdown" role="timer" aria-live="off">
      {cells.map(([n, label], i) => (
        <div className="countdown-cell" key={label}>
          <span className="countdown-num">
            {localizeDigits(String(n).padStart(2, "0"), locale)}
          </span>
          <span className="countdown-label">{label}</span>
          {i < cells.length - 1 ? <span className="countdown-sep" aria-hidden>:</span> : null}
        </div>
      ))}
    </div>
  );
}
