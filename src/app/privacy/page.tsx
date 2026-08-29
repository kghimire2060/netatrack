import { Card } from "@/components/ui";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <div className="wrap section" style={{ maxWidth: "76ch" }}>
      <h1>Privacy policy</h1>
      <p className="muted">
        NetaTrack collects the minimum data needed to run the platform, and publishes as little of
        it as possible.
      </p>

      <Card title="What is collected">
        <ul style={{ marginBottom: 0 }}>
          <li><strong>Account</strong> — name, email address, password hash, role and account status.</li>
          <li><strong>Participation</strong> — your ratings, poll votes and submitted issues.</li>
          <li><strong>Security</strong> — session records, login timestamps and a hashed form of your IP address for abuse detection.</li>
          <li><strong>Audit</strong> — a record of privileged administrative actions, for accountability.</li>
        </ul>
      </Card>

      <Card title="What is never public" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li>Your email address, phone number and account details.</li>
          <li>Your identity as the reporter of a citizen issue.</li>
          <li>Your identity as the author of an individual candidate rating.</li>
          <li>Internal staff notes on any issue.</li>
          <li>Any raw IP address.</li>
        </ul>
      </Card>

      <Card title="Passwords and credentials" className="section-tight">
        <p style={{ marginBottom: 0 }}>
          Passwords are stored only as a bcrypt hash and are never recoverable, logged or displayed.
          Email verification and password reset links are stored as SHA-256 hashes, expire, and can
          be used once. SMTP credentials live only in server environment variables and are never
          sent to a browser or mobile app.
        </p>
      </Card>

      <Card title="Your controls" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li>Update or delete your rating on any candidate at any time.</li>
          <li>Revoke every active session from your account security page.</li>
          <li>Enable multi-factor authentication on your account.</li>
          <li>Request account deletion; published aggregate figures are recomputed without your data.</li>
        </ul>
      </Card>

      <Card title="Retention" className="section-tight">
        <p style={{ marginBottom: 0 }}>
          Sessions expire after 7 days. Verification and reset tokens expire within 24 hours and 60
          minutes respectively. Audit records are retained for accountability and are not editable
          through the application.
        </p>
      </Card>
    </div>
  );
}
