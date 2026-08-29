import { redirect } from "next/navigation";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { allSettings } from "@/lib/settings";
import { smtpConfigured } from "@/lib/email";
import { Card } from "@/components/ui";
import { SettingsForm } from "@/components/admin-forms";

export const metadata = { title: "System settings" };

export default async function AdminSettingsPage() {
  const actor = await requireActorPage("/admin/settings");
  if (!(await can({ userId: actor.userId, role: actor.role }, "settings.manage"))) redirect("/admin");

  const values = await allSettings();

  return (
    <>
      <h1>System settings</h1>
      <p className="muted">
        Brand text, complaint policy and feature flags. Secrets are never stored here — they live in
        server environment variables.
      </p>

      <div className="grid grid-sidebar">
        <Card title="Configuration">
          <SettingsForm values={values} />
        </Card>

        <aside className="stack">
          <Card title="Environment">
            <dl className="kv">
              <dt>SMTP</dt>
              <dd>
                {smtpConfigured() ? (
                  <span className="badge badge-good">Configured</span>
                ) : (
                  <span className="badge badge-warn">Not configured</span>
                )}
              </dd>
              <dt>Node environment</dt>
              <dd>{process.env.NODE_ENV}</dd>
              <dt>App URL</dt>
              <dd className="mono small">{process.env.APP_URL ?? "not set"}</dd>
            </dl>
            <hr className="divider" />
            <p className="small muted" style={{ margin: 0 }}>
              Database credentials, the session secret and SMTP credentials are read from the
              environment only. They are never displayed here, never returned by any API and never
              committed to source control.
            </p>
          </Card>

          <div className="notice">
            Changing a feature flag takes effect within 30 seconds across all server instances.
          </div>
        </aside>
      </div>
    </>
  );
}
