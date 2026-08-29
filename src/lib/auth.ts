import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, randomUUID } from "crypto";
import { prisma } from "./db";
import type { Role, AccountStatus } from "@prisma/client";

export const SESSION_COOKIE = "netatrack_session";
const SESSION_DAYS = 7;

function secretKey() {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please");
  }
  return new TextEncoder().encode(raw);
}

export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
  jti: string;
};

export type Actor = {
  userId: string;
  role: Role;
  email: string;
  fullName: string;
  status: AccountStatus;
};

// ------------------------------ passwords ----------------------------------

/** bcrypt cost 12. Plain passwords are never stored or logged. */
export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("must be at least 10 characters");
  if (!/[a-z]/.test(password)) problems.push("must contain a lowercase letter");
  if (!/[A-Z]/.test(password)) problems.push("must contain an uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("must contain a digit");
  return problems;
}

// ------------------------------- sessions ----------------------------------

export async function createSession(
  user: { id: string; role: Role; email: string },
  meta: { ip?: string | null; userAgent?: string | null } = {}
) {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.session.create({
    data: {
      jti,
      userId: user.id,
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 250) ?? null,
    },
  });

  const token = await new SignJWT({ userId: user.id, role: user.role, email: user.email, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });

  return { jti, expiresAt };
}

/**
 * Reads and validates the session. A revoked or expired Session row invalidates
 * the JWT immediately — a signed token alone is never enough.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let payload: SessionPayload;
  try {
    const result = await jwtVerify(token, secretKey());
    payload = result.payload as unknown as SessionPayload;
  } catch {
    return null;
  }
  if (!payload?.jti) return null;

  const session = await prisma.session.findUnique({ where: { jti: payload.jti } }).catch(() => null);
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  return payload;
}

/** Full actor record, re-read from the database so status changes apply at once. */
export async function getActor(): Promise<Actor | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user
    .findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, email: true, fullName: true, status: true },
    })
    .catch(() => null);

  if (!user || user.status !== "ACTIVE") return null;
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
  };
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  return actor;
}

export async function destroySession() {
  const session = await getSession();
  if (session?.jti) {
    await prisma.session
      .update({ where: { jti: session.jti }, data: { revokedAt: new Date() } })
      .catch(() => null);
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** "Log out everywhere" — revokes every live session for the user. */
export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ------------------------- single-use email tokens --------------------------

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Returns the raw token (emailed to the user); only its SHA-256 hash is stored,
 * so a database leak does not yield usable reset links.
 */
export async function issueToken(
  userId: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET",
  ttlMinutes = 60
) {
  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return raw;
}

export async function consumeToken(
  raw: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
) {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!record || record.purpose !== purpose) return null;
  if (record.usedAt || record.expiresAt < new Date()) return null;

  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record;
}

// ------------------------------ request meta --------------------------------

export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };
}

/** Never store a raw IP against public content; hash it for abuse detection. */
export function hashIp(ip: string | null | undefined) {
  if (!ip) return null;
  return createHash("sha256")
    .update(ip + (process.env.SESSION_SECRET ?? ""))
    .digest("hex")
    .slice(0, 32);
}
