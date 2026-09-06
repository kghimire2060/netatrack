import Link from "next/link";
import { Card } from "@/components/ui";
import { RATING_DIMENSIONS } from "@/lib/ratings";
import { SCORE_WEIGHTS } from "@/lib/accountability";

export const metadata = { title: "Rating methodology" };

export default function MethodologyPage() {
  return (
    <div className="wrap section" style={{ maxWidth: "76ch" }}>
      <h1>Rating and scoring methodology</h1>
      <p className="muted">
        Published in full so that any score on this platform can be independently reconstructed.
      </p>

      <Card title="What a candidate rating measures">
        <p>
          A candidate rating measures <strong>public perception</strong>. It is not a measure of
          competence, not an endorsement, and not a prediction. It is never combined with, or
          displayed as, an official election result.
        </p>
        <p style={{ marginBottom: 0 }}>
          Each registered account may submit one rating per candidate and may update it at any time.
          Updating replaces the previous rating rather than adding a second one.
        </p>
      </Card>

      <Card title="Dimensions and weights" className="section-tight">
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Dimension</th>
                <th className="num">Weight</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {RATING_DIMENSIONS.map((dimension) => (
                <tr key={dimension.key}>
                  <td data-label="Dimension">{dimension.label}</td>
                  <td className="num" data-label="Weight">
                    {Math.round(dimension.weight * 100)}%
                  </td>
                  <td data-label="Purpose">{dimension.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: ".8rem", marginBottom: 0 }}>
          Each dimension is scored from 1 to 5. A single rating&apos;s score is the weighted sum of
          its six dimensions, rounded to two decimals. A candidate&apos;s published figure is the
          arithmetic mean of every visible rating.
        </p>
      </Card>

      <Card title="Worked example" className="section-tight">
        <pre
          className="mono small"
          style={{ background: "#f7faff", padding: ".8rem", borderRadius: "9px", overflowX: "auto" }}
        >
{`Public trust        4 × 0.20 = 0.80
Communication       3 × 0.15 = 0.45
Local issue focus   5 × 0.20 = 1.00
Policy clarity      4 × 0.15 = 0.60
Responsiveness      3 × 0.15 = 0.45
Overall             4 × 0.15 = 0.60
                             ------
Rating score                   3.90 / 5`}
        </pre>
      </Card>

      <Card title="The Accountability Score">
        <p>
          The Accountability Score on a politician&apos;s profile is built from{" "}
          <strong>official, source-backed records only</strong>: recorded promises, constituency
          projects, parliamentary attendance and the fact-check record. Public star ratings are{" "}
          <strong>never</strong> an input. The two are shown side by side and measure different
          things — one is what the record shows, the other is what people think — and averaging
          them would mean a coordinated rating campaign could move a figure that is supposed to be
          answerable with documents.
        </p>

        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Component</th>
                <th className="num">Weight</th>
                <th>What it measures</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Component">Promises</td>
                <td className="num" data-label="Weight">{Math.round(SCORE_WEIGHTS.promises * 100)}%</td>
                <td data-label="What it measures">
                  Completed 100%, in progress 50%, delayed 25%, not started and cancelled 0%.
                </td>
              </tr>
              <tr>
                <td data-label="Component">Projects</td>
                <td className="num" data-label="Weight">{Math.round(SCORE_WEIGHTS.projects * 100)}%</td>
                <td data-label="What it measures">
                  Completed 100%, in progress 50%, approved 25%, stalled 10%, proposed and
                  cancelled 0%. Stalled scores below delayed because funds were released against
                  work that then stopped.
                </td>
              </tr>
              <tr>
                <td data-label="Component">Parliament</td>
                <td className="num" data-label="Weight">{Math.round(SCORE_WEIGHTS.parliament * 100)}%</td>
                <td data-label="What it measures">
                  Recorded attendance only. Questions asked, bills sponsored and committee
                  meetings are published as figures but are <strong>not</strong> scored: they are
                  counts with no official denominator, so scoring them would need a benchmark for
                  &ldquo;enough&rdquo; that no authority publishes.
                </td>
              </tr>
              <tr>
                <td data-label="Component">Fact-checks</td>
                <td className="num" data-label="Weight">{Math.round(SCORE_WEIGHTS.factChecks * 100)}%</td>
                <td data-label="What it measures">
                  True 100%, mostly true 75%, misleading 25%, false 0%. Weighted lowest because it
                  usually rests on very few data points.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Missing data is not a zero" className="section-tight">
        <p>
          A component with nothing recorded behind it is <strong>removed</strong> from the
          calculation and the remaining weights are renormalised. A representative with no
          parliamentary record has not scored 0% on attendance — we do not know. Scoring absence as
          failure would make the number a measure of how much data we have typed in rather than of
          what the politician did.
        </p>
        <p>
          Because that changes what the score rests on, every badge publishes its{" "}
          <strong>coverage</strong>: whether it was built on the full record, a partial one, or a
          small enough part of it to be provisional. A record that scores nothing at all shows no
          number, not a zero.
        </p>
        <p style={{ marginBottom: 0 }}>
          Individually unverifiable records are also excluded rather than counted against the
          subject: a promise nobody can confirm either way, and a fact-check that reached no
          conclusion, both leave the denominator.
        </p>
      </Card>

      <Card title="What the score does not count" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li>Public star ratings — shown separately, never averaged in.</li>
          <li>
            Citizen issues filed with a representative. An unresolved issue is not scored against
            them: filing records that an issue was raised, not that they caused it.
          </li>
          <li>Party affiliation, incumbency, or how long someone has held office.</li>
          <li>News coverage volume or sentiment.</li>
        </ul>
      </Card>

      <Card title="Safeguards against manipulation" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li>Only authenticated accounts may rate; anonymous rating is not offered.</li>
          <li>Rating submission is rate limited per account and per address.</li>
          <li>A hashed address is retained for abuse detection — never the raw address.</li>
          <li>A candidate cannot rate their own claimed profile.</li>
          <li>Unusual submission patterns are flagged for a moderator, who must record a reason for any removal.</li>
          <li>Any user can report a rating as abusive or fraudulent.</li>
          <li>Removed and hidden ratings are excluded from the published average and count.</li>
        </ul>
      </Card>

      <Card title="Performance records are separate" className="section-tight">
        <p style={{ marginBottom: 0 }}>
          Representative performance records — attendance, questions, bills, committee participation,
          constituency activity — are <strong>objective, source-backed records</strong>, published
          separately from perception ratings and always with a source reference. Where authoritative
          public records do not exist, the field is left empty rather than estimated.
        </p>
      </Card>

      <Card title="Fact-check labels" className="section-tight">
        <ul style={{ marginBottom: 0 }}>
          <li><strong>True</strong> — the claim is accurate and nothing significant is missing.</li>
          <li><strong>Mostly true</strong> — accurate, but needs clarification or context.</li>
          <li><strong>Misleading</strong> — technically defensible but creates a false impression.</li>
          <li><strong>False</strong> — the claim is not supported by the evidence.</li>
          <li><strong>Unverified</strong> — reviewed, but no reliable evidence either way.</li>
          <li><strong>Insufficient evidence</strong> — evidence exists but is too thin to rule.</li>
        </ul>
      </Card>

      <p className="small muted">
        Questions about a score or a verdict? See <Link href="/about">about and neutrality</Link>.
      </p>
    </div>
  );
}
