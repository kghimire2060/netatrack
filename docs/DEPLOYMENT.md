# Deployment

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes | ≥ 32 characters. The app refuses to start in production without it. |
| `APP_URL` | yes | Absolute base URL used in email links |
| `APP_NAME` | no | Display name, defaults to NetaTrack |
| `SMTP_HOST` | production | Leave empty in development and mail is logged instead of sent |
| `SMTP_PORT` | production | Usually 587 with STARTTLS, or 465 with `SMTP_SECURE=true` |
| `SMTP_SECURE` | production | `true` for implicit TLS |
| `SMTP_USER` / `SMTP_PASS` | production | SMTP credentials — environment or secret manager only |
| `SMTP_FROM` | production | e.g. `NetaTrack <no-reply@netatrack.org>` |
| `UPLOAD_DIR` / `MAX_UPLOAD_BYTES` | no | Reserved for the upload endpoint |

Generate the session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env`. It is gitignored.

## First deploy

```bash
npm ci
npx prisma migrate deploy     # applies committed migrations, never generates
npm run build
npm start                     # or your process manager
```

Seed **only** a non-production environment:

```bash
npm run db:seed
```

For production, create the first Super Admin directly instead — the seed's demo
password must never exist on a live system:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_MATRIX } from './src/lib/permissions';
const db = new PrismaClient();
(async () => {
  for (const [role, perms] of Object.entries(DEFAULT_ROLE_MATRIX))
    for (const permission of perms)
      await db.rolePermission.upsert({
        where: { role_permission: { role, permission } }, update: {},
        create: { role, permission },
      });
  await db.user.create({ data: {
    email: process.env.ADMIN_EMAIL,
    fullName: process.env.ADMIN_NAME,
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: 'SUPER_ADMIN', status: 'ACTIVE', emailVerified: true,
  }});
  await db.\$disconnect();
})();
"
```

Then sign in and enable multi-factor authentication immediately — it cannot be
turned off on a Super Admin account afterwards.

## Background worker

Transactional email is queued in the database and delivered inline. Run the retry
worker on a schedule so a transient SMTP outage never loses a lifecycle
notification:

```
*/5 * * * *  cd /srv/netatrack && npm run mailer >> /var/log/netatrack-mailer.log 2>&1
```

## Scaling

Before running more than one instance, move these three in-process stores to Redis:

- `src/lib/rate-limit.ts` — counters, otherwise limits apply per node
- `src/lib/rbac.ts` — the permission matrix cache (60s TTL)
- `src/lib/settings.ts` — the settings cache (30s TTL)

For election-day traffic, also switch the genuinely public pages (results, candidate
profiles, news) from `force-dynamic` to cached rendering with tag revalidation on
publish. The root layout currently forces dynamic rendering for the whole tree
because it reads the session cookie.

## Infrastructure checklist

- [ ] TLS on the production domain, HTTP redirected
- [ ] CDN in front of static assets
- [ ] WAF with rate limiting at the edge, on top of the application limits
- [ ] Managed PostgreSQL with automated backups and point-in-time recovery
- [ ] **A restore actually tested**, not just a backup taken
- [ ] Redis provisioned for cache, rate limiting and the email queue
- [ ] Centralised logs and error monitoring
- [ ] Uptime and performance monitoring with alerting
- [ ] Security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`
- [ ] Separate development, staging and production environments and databases
- [ ] Database user restricted to least privilege (no superuser)

## Launch checklist

Section 22 of the proposal, as an operational list:

- [ ] Production domain and SSL certificate live
- [ ] SMTP authenticated and a real delivery test passed from `/admin/notifications`
- [ ] SPF, DKIM and DMARC configured on the sending domain
- [ ] MFA enabled on every Super Admin and Admin account
- [ ] Role and permission matrix reviewed against the intended access model
- [ ] Backup taken and a restore rehearsed end to end
- [ ] Audit logging confirmed writing in production
- [ ] Privacy policy and terms of use published and reviewed
- [ ] Rating methodology published at `/methodology`
- [ ] Election source policy documented on `/about`
- [ ] Seed demo accounts removed or disabled
- [ ] `SESSION_SECRET` rotated away from any value used in staging
- [ ] UAT signed off for each role: admin, staff, citizen, candidate, researcher
- [ ] Load test against expected election-day peak
- [ ] Security review completed, findings closed

## Rollback

Migrations are forward-only. To roll back a release, redeploy the previous build;
if a migration must be undone, write a new migration that reverses it rather than
editing history. Take a database snapshot before every production migration.
