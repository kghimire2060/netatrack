import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, Pager } from "@/components/ui";
import { LevelBadge } from "@/components/status";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel, formatCount } from "@/lib/i18n";
import { getGeographyTree } from "@/lib/constituencies";
import { resolveProvince, provinceName, PROVINCES } from "@/lib/geography";
import { GeographyNav } from "@/components/constituency/geography-nav";
import type { GovernmentLevel, Prisma } from "@prisma/client";

export const metadata = { title: "Constituencies" };

export default async function ConstituenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ province?: string; q?: string; level?: string; page?: string }>;
}) {
  const { t, locale } = await getTranslator();
  const params = await searchParams;

  const PAGE_SIZE = 50;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const level = (["FEDERAL", "PROVINCIAL", "LOCAL"] as const).find((l) => l === params.level);
  const where: Prisma.ConstituencyWhereInput = {
    // The column holds "Bagmati" in one environment and "bagmati" in another,
    // so the filter matches case-insensitively rather than on exact text.
    ...(params.province
      ? { province: { equals: params.province, mode: "insensitive" as const } }
      : {}),
    ...(level ? { level: level as GovernmentLevel } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" as const } },
            { nameNe: { contains: params.q } },
            { district: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const total = await prisma.constituency.count({ where });
  const constituencies = await prisma.constituency.findMany({
    where,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: [{ province: "asc" }, { district: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      province: true,
      district: true,
      registeredVoters: true,
      level: true,
      localBodyType: true,
      nameNe: true,
      population: true,
      pollingStationCount: true,
      _count: { select: { candidates: true, pollingStations: true, complaints: true } },
    },
  });

  // Province options come from the canonical registry, not from distinct
  // column values, which would surface duplicate or lowercase entries.
  const tree = await getGeographyTree();
  const present = new Set(tree.provinces.map((p) => p.province.slug));
  const provinces = PROVINCES.filter((p) => present.has(p.slug));

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
            <option value="LOCAL">{t("con.local")}</option>
          </select>
          <select name="province" defaultValue={params.province ?? ""}>
            <option value="">{t("con.allProvinces")}</option>
            {provinces.map((p) => (
              <option key={p.slug} value={p.slug}>
                {provinceName(p, locale)}
              </option>
            ))}
          </select>
          <button className="btn btn-sm">{t("common.filter")}</button>
        </form>
      </Card>

      <Card title={t("con.browse")} className="section-tight">
        <GeographyNav
          t={t}
          locale={locale}
          provinces={tree.provinces}
          activeProvince={params.province ?? null}
        />
        {tree.unresolved.length > 0 ? (
          <p className="small faint" style={{ marginTop: ".6rem" }}>
            {formatCount(
              tree.unresolved.reduce((n, u) => n + u.count, 0),
              locale
            )}{" "}
            {t("con.unresolvedProvince")}: {tree.unresolved.map((u) => u.raw).join(", ")}
          </p>
        ) : null}
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
                <th>{t("con.type")}</th>
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
                  <td data-label={t("con.title")}>
                    <Link href={`/constituency/${constituency.slug}`}>{constituency.name}</Link>
                  </td>
                  <td data-label={t("con.level")}>
                    <LevelBadge level={constituency.level} />
                  </td>
                  <td data-label={t("con.type")}>
                    {constituency.localBodyType ? (
                      <span className="badge badge-muted">
                        {enumLabel(constituency.localBodyType, locale)}
                      </span>
                    ) : (
                      <span className="faint">—</span>
                    )}
                  </td>
                  <td data-label={t("cand.district")}>{constituency.district}</td>
                  <td data-label={t("con.province")}>
                    {provinceName(resolveProvince(constituency.province), locale) ??
                      constituency.province}
                  </td>
                  <td className="num" data-label={t("con.registeredVoters")}>
                    {constituency.registeredVoters === null ? "—" : formatCount(constituency.registeredVoters, locale)}
                  </td>
                  <td className="num" data-label={t("cand.title")}>
                    {formatCount(constituency._count.candidates, locale)}
                  </td>
                  <td className="num" data-label={t("con.pollingStations")}>
                    {formatCount(constituency.pollingStationCount ?? constituency._count.pollingStations, locale)}
                  </td>
                  <td className="num" data-label={t("con.citizenIssues")}>
                    {formatCount(constituency._count.complaints, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/constituencies"
        query={{ q: params.q, province: params.province, level: params.level }}
      />
    </div>
  );
}
