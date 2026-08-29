import { prisma } from "./db";
import {
  DEFAULT_ROLE_MATRIX,
  SUPER_ADMIN_ONLY,
  type Permission,
  type RoleName,
} from "./permissions";

/**
 * Server-side authorization.
 *
 * The frontend may hide controls, but every privileged action MUST pass
 * through `requirePermission` (or `can`) on the server. Nothing here trusts
 * anything sent by the client.
 */

const CACHE_TTL_MS = 60_000;

type Cache = { at: number; matrix: Record<string, Set<string>> } | null;
let cache: Cache = null;

async function loadMatrix(): Promise<Record<string, Set<string>>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.matrix;

  const matrix: Record<string, Set<string>> = {};
  try {
    const rows = await prisma.rolePermission.findMany();
    if (rows.length > 0) {
      for (const row of rows) {
        (matrix[row.role] ??= new Set()).add(row.permission);
      }
    }
  } catch {
    // Database unavailable (e.g. build-time prerender) — fall through to the
    // compiled defaults rather than failing open.
  }

  if (Object.keys(matrix).length === 0) {
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_MATRIX)) {
      matrix[role] = new Set(perms);
    }
  }

  cache = { at: Date.now(), matrix };
  return matrix;
}

/** Call after editing RolePermission rows so the change takes effect at once. */
export function invalidatePermissionCache() {
  cache = null;
}

export async function permissionsForRole(role: RoleName): Promise<Set<string>> {
  const matrix = await loadMatrix();
  return matrix[role] ?? new Set();
}

export async function can(
  actor: { userId?: string; role: RoleName },
  permission: Permission
): Promise<boolean> {
  if (actor.userId) {
    const override = await prisma.userPermissionOverride
      .findUnique({
        where: { userId_permission: { userId: actor.userId, permission } },
      })
      .catch(() => null);
    if (override) return override.granted;
  }
  const perms = await permissionsForRole(actor.role);
  return perms.has(permission);
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(public permission: Permission) {
    super(`Forbidden: missing permission "${permission}"`);
    this.name = "ForbiddenError";
  }
}

export async function requirePermission(
  actor: { userId?: string; role: RoleName },
  permission: Permission
): Promise<void> {
  if (!(await can(actor, permission))) throw new ForbiddenError(permission);
}

/** Ownership check helper: allow when the actor owns the record OR has the escalated permission. */
export async function canActOnOwn(
  actor: { userId: string; role: RoleName },
  ownerId: string | null | undefined,
  escalatedPermission: Permission
): Promise<boolean> {
  if (ownerId && ownerId === actor.userId) return true;
  return can(actor, escalatedPermission);
}

/**
 * Guards a role/permission grant. Prevents privilege escalation: only a
 * SUPER_ADMIN may hand out SUPER_ADMIN-only permissions, and nobody may grant
 * a permission they do not themselves hold.
 */
export async function assertCanGrant(
  actor: { userId: string; role: RoleName },
  permission: Permission
): Promise<void> {
  if (SUPER_ADMIN_ONLY.includes(permission) && actor.role !== "SUPER_ADMIN") {
    throw new ForbiddenError(permission);
  }
  if (!(await can(actor, permission))) throw new ForbiddenError(permission);
}

export type { Permission, RoleName };
