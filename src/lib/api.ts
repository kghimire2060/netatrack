import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { UnauthorizedError, requireActor, requestMeta, type Actor } from "./auth";
import { ForbiddenError, requirePermission } from "./rbac";
import { rateLimit, type RateLimitResult } from "./rate-limit";
import type { Permission } from "./permissions";

/** Shared response/guard helpers so every route enforces the same contract. */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data as object, { status: 201 });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Maps thrown auth/permission/validation errors onto correct status codes. */
export function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return fail(error.message, 401);
  if (error instanceof ForbiddenError) {
    return fail("You do not have permission to perform this action", 403, {
      permission: error.permission,
    });
  }
  if (error instanceof ZodError) {
    return fail("Invalid input", 400, { issues: flattenIssues(error) });
  }
  console.error("[api] unhandled error", error);
  return fail("Something went wrong", 500);
}

export function flattenIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const raw = await req.json().catch(() => null);
  return schema.parse(raw);
}

export function parseQuery<T>(req: Request, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return schema.parse(params);
}

/** Authenticated actor + server-side permission check in one call. */
export async function guard(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  await requirePermission({ userId: actor.userId, role: actor.role }, permission);
  return actor;
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/** Applies a rate limit keyed on client IP; returns a 429 response or null. */
export async function limitByIp(
  bucket: string,
  config: { limit: number; windowMs: number }
): Promise<NextResponse | null> {
  const { ip } = await requestMeta();
  const result = rateLimit(`${bucket}:${ip ?? "unknown"}`, config.limit, config.windowMs);
  return result.ok ? null : rateLimitResponse(result);
}

export function paginationFrom(url: string, defaultSize = 20, maxSize = 100) {
  const params = new URL(url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const size = Math.min(
    maxSize,
    Math.max(1, Number.parseInt(params.get("pageSize") ?? String(defaultSize), 10) || defaultSize)
  );
  return { page, size, skip: (page - 1) * size, take: size };
}

export function pageMeta(total: number, page: number, size: number) {
  return { total, page, pageSize: size, pages: Math.max(1, Math.ceil(total / size)) };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
}

export { requestMeta };
