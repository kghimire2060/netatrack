"use client";

import { useEffect, useRef, useState } from "react";
import { localizeDigits } from "@/lib/i18n";
import { useLocale } from "../locale-provider";

/**
 * Count-up figure. Starts only when scrolled into view, and renders the final
 * value immediately for anyone who prefers reduced motion or has JS disabled —
 * the number is the content, the animation is decoration.
 */
export function AnimatedCounter({
  value,
  duration = 1400,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const { locale } = useLocale();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          // easeOutExpo: fast then settling, so the final value is readable early
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          setShown(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        setShown(0);
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {localizeDigits(shown.toLocaleString("en-US"), locale)}
    </span>
  );
}
