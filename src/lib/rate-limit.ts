/**
 * Fixed-window rate limiting.
 *
 * In-process by design for a single node: swap `store` for Redis (the
 * architecture in section 16 already provisions it) when running more than one
 * instance, since counters below are not shared across processes.
 */

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of store) if (entry.resetAt <= now) store.delete(key);
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  const ok = entry.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSeconds: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  complaintCreate: { limit: 5, windowMs: 60 * 60_000 },
  rating: { limit: 20, windowMs: 60 * 60_000 },
  pollVote: { limit: 30, windowMs: 60 * 60_000 },
  publicRead: { limit: 300, windowMs: 60_000 },
  export: { limit: 10, windowMs: 60 * 60_000 },
} as const;
