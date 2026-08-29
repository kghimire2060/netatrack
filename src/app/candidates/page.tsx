import Link from "next/link";
import { prisma } from "@/lib/db";
import { Avatar, Card, EmptyState, Pager, Stars } from "@/components/ui";
import { VerificationBadge } from "@/components/status";
import type { Prisma } from "@prisma/client";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Candidates" };

const PAGE_SIZE = 12;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; party?: string; district?: string; page?: string; verified?: string }>;
}) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.CandidateWhereInput = {
    ...(params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" } },
            { agenda: { contains: params.q, mode: "insensitive" } },
            { keyIssues: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.party ? { party: { slug: params.party } } : {}),
    ...(params.district ? { constituency: { district: params.district } } : {}),
    ...(params.verified === "1" ? { verificationStatus: "VERIFIED" as const } : {}),
  };

  const [total, candidates, parties, districts] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.findMany({
      where,
      orderBy: [{ verificationStatus: "asc" }, { fullName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        fullName: true,
        photoUrl: true,
        keyIssues: true,
        verificationStatus: true,
        party: { select: { name: true, shortName: true } },
        constituency: { select: { name: true, district: true } },
        ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
      },
    }),
    prisma.party.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.constituency.findMany({
      select: { district: true },
      distinct: ["district"],
      orderBy: { district: "asc" },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="wrap section">
      <div className="row-between">
        <div>
          <h1>{t("cand.title")}</h1>
          <p className="muted">{t("cand.lede")}</p>
        </div>
        <Link className="btn btn-ghost" href="/compare">
          {t("cand.compare")}
        </Link>
      </div>

      <Card className="section-tight">
        <form method="get" className="grid grid-4" style={{ alignItems: "end" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="q">{t("cand.searchLabel")}</label>
            <input id="q" name="q" defaultValue={params.q ?? ""} placeholder={t("cand.searchPlaceholder")} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="party">{t("cand.party")}</label>
            <select id="party" name="party" defaultValue={params.party ?? ""}>
              <option value="">{t("cand.allParties")}</option>
              {parties.map((party) => (
                <option key={party.slug} value={party.slug}>
                  {party.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="district">{t("cand.district")}</label>
            <select id="district" name="district" defaultValue={params.district ?? ""}>
              <option value="">{t("cand.allDistricts")}</option>
              {districts.map((row) => (
                <option key={row.district} value={row.district}>
                  {row.district}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: ".5rem" }}>
            <label className="row small" style={{ margin: 0 }}>
              <input type="checkbox" name="verified" value="1" defaultChecked={params.verified === "1"} />
              <span>{t("cand.verifiedOnly")}</span>
            </label>
            <button className="btn btn-sm">{t("common.filter")}</button>
          </div>
        </form>
      </Card>

      <p className="small muted" style={{ marginTop: "1rem" }}>
        {total.toLocaleString()} {t("cand.count")}
      </p>

      {candidates.length === 0 ? (
        <Card>
          <EmptyState title={t("cand.noMatch")} />
        </Card>
      ) : (
        <div className="grid grid-3">
          {candidates.map((candidate) => {
            const count = candidate.ratings.length;
            const average =
              count === 0
                ? 0
                : candidate.ratings.reduce((sum, rating) => sum + rating.weightedScore, 0) / count;
            return (
              <Link
                key={candidate.id}
                href={`/candidates/${candidate.slug}`}
                className="card card-hover"
              >
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <Avatar name={candidate.fullName} url={candidate.photoUrl} />
                  <div className="grow">
                    <strong>{candidate.fullName}</strong>
                    <div className="small muted">
                      {candidate.party?.name ?? "Independent"}
                    </div>
                    <div className="small faint">
                      {candidate.constituency
                        ? `${candidate.constituency.name}, ${candidate.constituency.district}`
                        : "Constituency not recorded"}
                    </div>
                  </div>
                </div>
                <hr className="divider" />
                <div className="row-between">
                  {count > 0 ? (
                    <span className="row small">
                      <Stars value={average} />
                      <span className="faint">
                        {average.toFixed(1)} · {count}
                      </span>
                    </span>
                  ) : (
                    <span className="small faint">{t("cand.noRatings")}</span>
                  )}
                  <VerificationBadge status={candidate.verificationStatus} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pager
        page={page}
        pages={pages}
        basePath="/candidates"
        query={{ q: params.q, party: params.party, district: params.district, verified: params.verified }}
      />
    </div>
  );
}
