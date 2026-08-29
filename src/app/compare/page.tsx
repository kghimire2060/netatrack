import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, Stars } from "@/components/ui";
import { VerificationBadge } from "@/components/status";
import { ComparePicker } from "@/components/civic-forms";
import { summarize } from "@/lib/ratings";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Compare candidates" };

/** Side-by-side comparison on identical criteria (section 6). */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; constituency?: string }>;
}) {
  const params = await searchParams;
  const ids = (params.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 4);

  const constituencies = await prisma.constituency.findMany({
    select: { slug: true, name: true, district: true },
    orderBy: [{ district: "asc" }, { name: "asc" }],
  });

  const pickerList = params.constituency
    ? await prisma.candidate.findMany({
        where: { constituency: { slug: params.constituency } },
        select: { id: true, fullName: true, party: { select: { shortName: true, name: true } } },
        orderBy: { fullName: "asc" },
      })
    : [];

  const candidates =
    ids.length > 0
      ? await prisma.candidate.findMany({
          where: { id: { in: ids } },
          include: {
            party: true,
            constituency: true,
            ratings: {
              where: { status: "VISIBLE" },
              select: {
                publicTrust: true,
                communication: true,
                localIssueFocus: true,
                policyClarity: true,
                responsiveness: true,
                overall: true,
                weightedScore: true,
                updatedAt: true,
              },
            },
            promises: { select: { status: true } },
            results: {
              where: { status: "VERIFIED" },
              select: { votes: true, isWinner: true, election: { select: { year: true } } },
              orderBy: { election: { year: "desc" } },
              take: 1,
            },
          },
        })
      : [];

  const rows: { label: string; render: (candidate: (typeof candidates)[number]) => React.ReactNode }[] = [
    { label: "Party", render: (c) => c.party?.name ?? "Independent" },
    { label: "Constituency", render: (c) => c.constituency?.name ?? "—" },
    { label: "District", render: (c) => c.constituency?.district ?? "—" },
    { label: "Education", render: (c) => c.education ?? "Not recorded" },
    { label: "Experience", render: (c) => c.experience ?? "Not recorded" },
    { label: "Previous positions", render: (c) => c.previousPositions ?? "Not recorded" },
    {
      label: "Public rating",
      render: (c) => {
        const summary = summarize(c.ratings);
        return summary.count === 0 ? (
          <span className="faint">No ratings</span>
        ) : (
          <span className="row">
            <Stars value={summary.average} />
            <strong>{summary.average.toFixed(1)}/5</strong>
          </span>
        );
      },
    },
    {
      label: "Rating count",
      render: (c) => formatNumber(c.ratings.length),
    },
    {
      label: "Promises tracked",
      render: (c) => {
        const completed = c.promises.filter((p) => p.status === "COMPLETED").length;
        return c.promises.length === 0
          ? "—"
          : `${completed} completed of ${c.promises.length}`;
      },
    },
    {
      label: "Latest official result",
      render: (c) =>
        c.results[0] ? (
          <>
            {formatNumber(c.results[0].votes)} votes ({c.results[0].election.year}){" "}
            {c.results[0].isWinner ? <Badge tone="good">Elected</Badge> : null}
          </>
        ) : (
          <span className="faint">None recorded</span>
        ),
    },
    { label: "Agenda", render: (c) => (c.agenda ? <Link href={`/candidates/${c.slug}`}>View</Link> : "—") },
    { label: "Verification", render: (c) => <VerificationBadge status={c.verificationStatus} /> },
  ];

  return (
    <div className="wrap section">
      <h1>Compare candidates</h1>
      <p className="muted">
        Choose a constituency, then select up to four candidates to compare on identical criteria.
        Public ratings are opinion data and are shown separately from official results.
      </p>

      <Card>
        <form method="get" className="stack">
          <div className="field">
            <label htmlFor="constituency">Constituency</label>
            <select id="constituency" name="constituency" defaultValue={params.constituency ?? ""}>
              <option value="">Choose a constituency</option>
              {constituencies.map((constituency) => (
                <option key={constituency.slug} value={constituency.slug}>
                  {constituency.name} — {constituency.district}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm btn-ghost">Load candidates</button>
        </form>

        {pickerList.length > 0 ? (
          <ComparePicker
            constituency={params.constituency ?? ""}
            selected={ids}
            candidates={pickerList.map((candidate) => ({
              id: candidate.id,
              fullName: candidate.fullName,
              party: candidate.party?.shortName ?? candidate.party?.name ?? "Independent",
            }))}
          />
        ) : null}
      </Card>

      {candidates.length === 0 ? (
        <Card className="section-tight">
          <EmptyState
            title="No candidates selected"
            hint="Pick a constituency above, tick two to four candidates, then choose Compare."
          />
        </Card>
      ) : (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Category</th>
                {candidates.map((candidate) => (
                  <th key={candidate.id}>
                    <Link href={`/candidates/${candidate.slug}`}>{candidate.fullName}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {candidates.map((candidate) => (
                    <td key={candidate.id}>{row.render(candidate)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
