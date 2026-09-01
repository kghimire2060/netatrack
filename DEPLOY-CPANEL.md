# Deploying NetaTrack to cPanel (Babal Host)

Verified against the standalone bundle: every route returns 200 against the
production database, cold start ~90 ms.

The database stays on Neon. Only the application moves.

---

## What the host must provide

Confirmed present in this cPanel:

- **Setup Node.js App** (CloudLinux Node.js Selector) — needs Node 20 or 22
- **Terminal** or SSH
- **Cron Jobs** — replaces Vercel Cron for mail delivery
- **Git Version Control** — optional, makes updates a `git pull`

---

## 1. Get the code onto the server

**cPanel → Files → Git™ Version Control → Create**

| Field | Value |
|---|---|
| Clone URL | `https://github.com/kghimire2060/netatrack.git` |
| Repository Path | `/home2/netatrac/netatrack` |
| Repository Name | `netatrack` |

A private repo needs a deploy token in the URL. If cloning fails, upload a zip
to `/home2/netatrac/netatrack` via File Manager instead.

## 2. Create the Node.js application

**cPanel → Software → Setup Node.js App → Create Application**

| Field | Value |
|---|---|
| Node.js version | 22.x (20.x also works; **not** 16 or 18) |
| Application mode | Production |
| Application root | `netatrack` |
| Application URL | `netatrack.com` |
| Application startup file | `server.js` |

Click **Create**. Leave the page open — it shows a command like
`source /home2/netatrac/nodevenv/netatrack/22/bin/activate && cd ...`.
Copy it: every command below must run inside that environment.

## 3. Environment variables

Add these in the Node.js App screen (**Environment variables → Add**), or write
them to `/home2/netatrac/netatrack/.env`. Copy the values from Vercel →
Settings → Environment Variables.

```
DATABASE_URL           (the Neon connection string)
SESSION_SECRET
AUTH_JWT_SECRET
AUTH_PASSWORD_PEPPER
APP_URL                https://netatrack.com
APP_NAME               NetaTrack
NODE_ENV               production
CRON_SECRET            (any long random string)
SMTP_HOST              (from cPanel → Email Accounts → Connect Devices)
SMTP_PORT              465
SMTP_SECURE            true
SMTP_USER              support@netatrack.com
SMTP_PASS              (mailbox password)
SMTP_FROM              NetaTrack <support@netatrack.com>
```

Never commit these. `.env` is gitignored.

## 4. Build

In **Terminal**, paste the activate command from step 2, then:

```bash
cd ~/netatrack
npm ci
npm run build:standalone
npm run cpanel:prepare
```

`next build` needs roughly 1.5–2 GB of memory. If it is killed part-way
("Killed", exit 137), the account's LVE limit is too low — see *Building
elsewhere* below.

## 5. Start

Back in **Setup Node.js App**, click **Restart**. Then check:

```bash
curl -s https://netatrack.com/api/health
```

Expect `{"status":"ok","checks":{"database":true,...}}`.

## 6. Replace the Vercel cron

**cPanel → Advanced → Cron Jobs**, every 5 minutes:

```
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://netatrack.com/api/cron/mail >/dev/null 2>&1
```

Use the same `CRON_SECRET` value as step 3.

## 7. Switch DNS — last, and only after the above passes

Until this point netatrack.com still serves from Vercel and nothing is at risk.

In **Cloudflare** → netatrack.com → DNS:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `202.63.243.186` | DNS only (grey cloud) |
| A | `www` | `202.63.243.186` | DNS only |

Delete the old Vercel records (`76.76.21.21`, `cname.vercel-dns.com`).

Then **cPanel → Security → SSL/TLS Status → Run AutoSSL** to replace the
self-signed certificate with a real one. Wait for DNS to propagate first or it
will fail.

Keep the Vercel project for a week before deleting it — it is the rollback.

---

## Building elsewhere, if the server runs out of memory

Build on your own machine and upload the result:

```bash
npm run build:standalone
npm run cpanel:prepare
```

Upload `.next/standalone/` to `/home2/netatrac/netatrack/.next/standalone/`
(File Manager or SFTP), then Restart the app.

`cpanel:prepare` deletes any `.env` the build copied in, so a local database
URL is never shipped to production. Do not re-add it by hand.

---

## Mail DNS

Three records are missing on netatrack.com and mail will not work properly
without them. Add in Cloudflare:

| Type | Name | Content | Purpose |
|---|---|---|---|
| MX | `@` | `mail.netatrack.com` (priority 0) | receive mail |
| A | `mail` | `202.63.243.186` | resolve the mail host |
| TXT | `@` | `v=spf1 +a +mx +ip4:202.63.243.186 ~all` | stop mail being marked spam |

Confirm the exact hostname in **cPanel → Email Accounts → Connect Devices**
before adding these.

---

## What you lose by leaving Vercel

- **Automatic deploys.** Updates become: `git pull && npm ci && npm run
  build:standalone && npm run cpanel:prepare`, then Restart.
- **Automatic HTTPS renewal.** cPanel AutoSSL usually handles it; check yearly.
- **The global CDN.** For an audience inside Nepal a Nepal-hosted server may
  well be faster; for readers abroad it will be slower.
