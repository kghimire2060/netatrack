/**
 * Production bootstrap. Safe to re-run.
 *
 * Writes the role/permission matrix and default settings, then creates one
 * Super Admin if none exists. Deliberately separate from `prisma/seed.ts`,
 * which creates demo accounts with a published password and must never run
 * against production.
 *
 *   ADMIN_EMAIL=you@example.com npx tsx scripts/bootstrap-production.ts
 *
 * Prints a generated password once. Change it and enable MFA on first login.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { DEFAULT_ROLE_MATRIX } from "../src/lib/permissions";
import { SETTING_DEFAULTS } from "../src/lib/settings";

const db = new PrismaClient();

function generatePassword() {
  // Ambiguous characters removed so it survives being read aloud or retyped.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("") + "9Aa";
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("Set ADMIN_EMAIL to the address for the Super Admin account.");

  // --- role matrix ---------------------------------------------------------
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_MATRIX)) {
    for (const permission of permissions) {
      ops.push(
        db.rolePermission.upsert({
          where: { role_permission: { role: role as never, permission } },
          update: {},
          create: { role: role as never, permission },
        })
      );
    }
  }
  for (let i = 0; i < ops.length; i += 50) await db.$transaction(ops.slice(i, i + 50));
  console.log(`  role matrix: ${ops.length} grants`);

  // --- settings ------------------------------------------------------------
  const settingOps = Object.entries(SETTING_DEFAULTS).map(([key, value]) =>
    db.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as Prisma.InputJsonValue, category: key.split(".")[0] },
    })
  );
  await db.$transaction(settingOps);
  console.log(`  settings: ${settingOps.length} keys`);

  // --- super admin ---------------------------------------------------------
  const existing = await db.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { email: true },
  });
  if (existing) {
    console.log(`  super admin already exists: ${existing.email} — no new account created`);
    return;
  }

  const password = generatePassword();
  const user = await db.user.upsert({
    where: { email },
    update: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12),
    },
    create: {
      email,
      fullName: process.env.ADMIN_NAME ?? "Platform Administrator",
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
    select: { id: true, email: true },
  });

  await db.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: "SUPER_ADMIN",
      action: "system.bootstrap",
      targetType: "User",
      targetId: user.id,
      changeSummary: "Production bootstrap: role matrix, settings and initial Super Admin",
    },
  });

  console.log(`
  Super Admin created
    email:    ${user.email}
    password: ${password}

  Change this password and enable multi-factor authentication on first login.
  MFA cannot be disabled on a Super Admin account afterwards.
`);
}

main()
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
