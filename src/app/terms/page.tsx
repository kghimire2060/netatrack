import { Card } from "@/components/ui";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <div className="wrap section" style={{ maxWidth: "76ch" }}>
      <h1>Terms of use</h1>

      <Card title="Using the platform">
        <ul style={{ marginBottom: 0 }}>
          <li>One account per person. Accounts are not transferable.</li>
          <li>Submit accurate information. Deliberately false issue reports may lead to suspension.</li>
          <li>Do not publish other people&apos;s personal, identification or medical details.</li>
          <li>Do not attempt automated rating, vote manipulation, or scraping outside the approved research API.</li>
        </ul>
      </Card>

      <Card title="Content on the platform" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li>Official election data is reproduced with a source reference and is definitive only at the authority that published it.</li>
          <li>Candidate ratings are user-generated public opinion, not statements of fact.</li>
          <li>Editorial and fact-check records are independent and are not altered on request by their subjects.</li>
          <li>A subject may submit a response, which is published alongside the record.</li>
        </ul>
      </Card>

      <Card title="Moderation" className="section-tight">
        <p style={{ marginBottom: 0 }}>
          Abusive, fraudulent or unlawful content may be hidden or removed. Every moderation decision
          records a reason and is auditable. Suspended accounts lose access to submission features
          while retaining the ability to view public information.
        </p>
      </Card>

      <Card title="Availability" className="section-tight">
        <p style={{ marginBottom: 0 }}>
          NetaTrack aims for continuous availability, particularly during election periods, but does
          not guarantee uninterrupted service. Official information should always be confirmed with
          the responsible authority.
        </p>
      </Card>
    </div>
  );
}
