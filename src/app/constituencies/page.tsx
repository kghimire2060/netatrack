import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";
import { LevelBadge } from "@/components/status";
import { formatNumber } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Constituencies" };

export default async function ConstituenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ province?: string; q?: string; level?: string }>;
}) {
  const { t } = await getTranslator();
  const params = await searchParams;

  const constituencies = await prisma.constituency.findMany({
    where: {
      ...(params.province ? { province: params.province } : {}),
      ...(params.level === "FEDERAL" || params.level === "PROVINCIAL"
        ? { level: params.level }
        : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" as const } },
              { district: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ province: "asc" }, { district: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      province: true,
      district: true,
      registeredVoters: true,
      level: true,
      pollingStationCount: true,
      _count: { select: { candidates: true, pollingStations: true, complaints: true } },
    },
  });

  const provinces = await prisma.constituency.findMany({
    select: { province: true },
    distinct: ["province"],
    orderBy: { province: "asc" },
  });

  return (
    <div className="wrap section">
      <h1>{t("con.title")}</h1>
      <p className="muted">{t("con.lede")}</p>

      <Card>
        <form method="get" className="row" style={{ gap: ".6rem" }}>
          <input name="q" defaultValue={params.q ?? ""} placeholder={t("con.searchPlaceholder")} className="grow" />
          <select name="level" defaultValue={params.level ?? ""} aria-label="Level">
            <option value="">{t("con.allLevels")}</option>
            <option value="FEDERAL">{t("con.federal")}</option>
            <option value="PROVINCIAL">{t("con.provincial")}</option>
          </select>
          <select name="province" defaultValue={params.province ?? ""}>
            <option value="">{t("con.allProvinces")}</option>
            {provinces.map((row) => (
              <option key={row.province} value={row.province}>
                {row.province}
              </option>
            ))}
          </select>
          <button className="btn btn-sm">{t("common.filter")}</button>
        </form>
      </Card>

      {constituencies.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("con.noMatch")} />
        </Card>
      ) : (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data responsive">
            <thead>
              <tr>
                <th>{t("con.title")}</th>
                <th>{t("con.level")}</th>
                <th>{t("cand.district")}</th>
                <th>{t("con.province")}</th>
                <th className="num">{t("con.registeredVoters")}</th>
                <th className="num">{t("cand.title")}</th>
                <th className="num">{t("con.pollingStations")}</th>
                <th className="num">{t("con.citizenIssues")}</th>
              </tr>
            </thead>
            <tbody>
              {constituencies.map((constituency) => (
                <tr key={constituency.id}>
                  <td data-label="Constituency">
                    <Link href={`/constituencies/${constituency.slug}`}>{constituency.name}</Link>
                  </td>
                  <td data-label="Level">
                    <LevelBadge level={constituency.level} />
                  </td>
                  <td data-label="District">{constituency.district}</td>
                  <td data-label="Province">{constituency.province}</td>
                  <td className="num" data-label="Registered voters">
                    {formatNumber(constituency.registeredVoters)}
                  </td>
                  <td className="num" data-label="Candidates">
                    {constituency._count.candidates}
                  </td>
                  <td className="num" data-label="Polling stations">
                    {constituency.pollingStationCount ?? constituency._count.pollingStations}
                  </td>
                  <td className="num" data-label="Citizen issues">
                    {constituency._count.complaints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
