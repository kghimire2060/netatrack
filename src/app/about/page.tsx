import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata = { title: "About and neutrality" };

export default function AboutPage() {
  return (
    <div className="wrap section" style={{ maxWidth: "76ch" }}>
      <h1>About NetaTrack</h1>
      <p className="muted">
        NetaTrack is an independent digital platform for election information and citizen
        accountability. It is not an election authority, a political party, or a campaign.
      </p>

      <Card title="What the platform does">
        <p>
          <strong>Before an election</strong> — candidates, parties, constituencies, manifestos,
          local issues, comparison and public opinion.
        </p>
        <p>
          <strong>During an election</strong> — election calendar, polling information, official
          results, vote share and historical analysis.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>After an election</strong> — the elected representative, their promises, recorded
          activity, performance evidence and citizen issue resolution.
        </p>
      </Card>

      <Card title="Political neutrality" className="section-tight">
        <ul>
          <li>The rating and performance methodologies are published in full and applied identically to every candidate.</li>
          <li>Every record is labelled as official, candidate-submitted, editorial, or independently verified.</li>
          <li>Corrections keep a visible history; nothing is silently rewritten.</li>
          <li>Factual political claims carry a source or evidence reference wherever practical.</li>
          <li>Candidates have a response and appeal channel, but cannot edit editorial findings.</li>
          <li>Moderation decisions are recorded with a reason and are auditable.</li>
          <li>There is no hidden partisan ranking logic anywhere in the product.</li>
          <li>NetaTrack ratings are never represented as official election outcomes.</li>
        </ul>
      </Card>

      <Card title="What NetaTrack is not" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li>Not an official source of election results — the electoral authority&apos;s published record is definitive.</li>
          <li>Not a voting recommendation service — ratings are public perception, not endorsement.</li>
          <li>Not a complaints authority — the issue tracker records and routes citizen reports transparently; it does not replace formal legal or administrative channels.</li>
        </ul>
      </Card>

      <Card title="Roles on the platform" className="section-tight">
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Role</th>
                <th>Purpose</th>
                <th>Access level</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Role">Super Admin</td>
                <td data-label="Purpose">System owner and highest security authority.</td>
                <td data-label="Access">Full system, roles, permissions, settings, audit and emergency controls.</td>
              </tr>
              <tr>
                <td data-label="Role">Admin</td>
                <td data-label="Purpose">Operational and content administrator.</td>
                <td data-label="Access">All assigned business modules; limited security administration.</td>
              </tr>
              <tr>
                <td data-label="Role">Staff</td>
                <td data-label="Purpose">Data, editorial, moderation or complaint operations.</td>
                <td data-label="Access">Only assigned modules, queues and records.</td>
              </tr>
              <tr>
                <td data-label="Role">Public Citizen</td>
                <td data-label="Purpose">Browses and participates.</td>
                <td data-label="Access">Public data plus own profile, ratings, polls and issues.</td>
              </tr>
              <tr>
                <td data-label="Role">Candidate</td>
                <td data-label="Purpose">Manages an approved claimed profile.</td>
                <td data-label="Access">Permitted profile fields, submissions and responses only.</td>
              </tr>
              <tr>
                <td data-label="Role">Researcher</td>
                <td data-label="Purpose">Approved researcher or analyst.</td>
                <td data-label="Access">Research dashboards and approved dataset exports.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p className="small muted">
        See also the <Link href="/methodology">rating methodology</Link>, the{" "}
        <Link href="/privacy">privacy policy</Link> and the <Link href="/terms">terms of use</Link>.
      </p>
    </div>
  );
}
