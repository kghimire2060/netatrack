import Link from "next/link";
import { notFound } from "next/navigation";
import { getConstituencyProfile, trendSeries } from "@/lib/constituencies";
import { provinceName } from "@/lib/geography";
import { Avatar, Badge, Breadcrumb, Card, Meter, Stars } from "@/components/ui";
import { ComplaintBadge, IssueBadge, LevelBadge } from "@/components/status";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { Unavailable, NotRecorded } from "@/components/candidate/unavailable";
import { ContestHistory } from "@/components/constituency/contest-history";
import { TrendChart } from "@/components/constituency/trend-chart";
import { getTranslator } from "@/lib/locale-server";
import { formatCount, formatPct, enumLabel } from "@/lib/i18n";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getConstituencyProfile(slug);
  if (!c) return { title: "Constituency" };
  const province = c.provinceRef?.nameEn ?? c.province;
  return {
    title: `${c.name} — ${c.district}, ${province}`,
    description: `Election results, representative, candidates and citizen issues for ${c.name} in ${c.district} district, ${province} province.`,
    alternates: { canonical: `/constituency/${c.slug}` },
  };
}

export default async function ConstituencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();

  const c = await getConstituencyProfile(slug);
  if (!c) notFound();

  const province = provinceName(c.provinceRef, locale) ?? c.province;
  const pollingCount = c.pollingStationCount ?? c._count.pollingStations;
  const trend = trendSeries(c.contests);

  return (
    <div className="wrap section constituency">
      <Breadcrumb
        items={[
          { label: t("nav.home"), href: "/" },
          { label: t("con.title"), href: "/constituencies" },
          ...(c.provinceRef
            ? [{ label: province, href: `/constituencies?province=${encodeURIComponent(c.province)}` }]
            : []),
          { label: c.district },
          { label: c.name },
        ]}
      />

      {/* ============================ OVERVIEW ============================ */}
      <Card className="con-hero">
        <div className="con-hero-head">
          <div>
            <div className="con-titles">
              <h1>{c.name}</h1>
              {c.nameNe && locale === "en" ? <span className="con-alt">{c.nameNe}</span> : null}
              <LevelBadge level={c.level} />
              {c.localBodyType ? (
                <Badge tone="muted">{enumLabel(c.localBodyType, locale)}</Badge>
              ) : null}
              <VerifiedBadge tier={c.tier} t={t} />
            </div>
            <p className="con-place">
              {c.district} · {province}
              {c.parent ? (
                <>
                  {" · "}
                  {t("con.partOf")}{" "}
                  <Link href={`/constituency/${c.parent.slug}`}>{c.parent.name}</Link>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <dl className="con-facts">
          <div>
            <dt>{t("con.number")}</dt>
            <dd>{c.number === null ? <NotRecorded t={t} /> : formatCount(c.number, locale)}</dd>
          </div>
          <div>
            <dt>{t("con.registeredVoters")}</dt>
            <dd>
              {c.registeredVoters === null ? (
                <NotRecorded t={t} />
              ) : (
                formatCount(c.registeredVoters, locale)
              )}
            </dd>
          </div>
          <div>
            <dt>{t("con.pollingStations")}</dt>
            <dd>{pollingCount > 0 ? formatCount(pollingCount, locale) : <NotRecorded t={t} />}</dd>
          </div>
          <div>
            <dt>{t("con.wards")}</dt>
            <dd>{c.wards === null ? <NotRecorded t={t} /> : formatCount(c.wards, locale)}</dd>
          </div>
          <div>
            <dt>{t("con.population")}</dt>
            <dd>
              {c.population === null ? <NotRecorded t={t} /> : formatCount(c.population, locale)}
            </dd>
          </div>
          <div>
            <dt>{t("con.area")}</dt>
            <dd>
              {c.areaSqKm === null ? (
                <NotRecorded t={t} />
              ) : (
                <>
                  {formatCount(Math.round(c.areaSqKm), locale)} {t("con.areaUnit")}
                </>
              )}
            </dd>
          </div>
        </dl>

        <div className="con-meta">
          {c.lastUpdated ? (
            <span>
              {t("con.lastUpdated")}: <strong>{formatDateTime(c.lastUpdated)}</strong>
            </span>
          ) : null}
          <span className="con-completeness">
            {t("con.dataRecorded")}:{" "}
            <strong>
              {formatCount(c.completeness.known, locale)} / {formatCount(c.completeness.of, locale)}
            </strong>
            <Meter value={c.completeness.known} max={c.completeness.of} />
          </span>
        </div>
      </Card>

      <div className="grid grid-sidebar con-grid">
        <div className="stack">
          {/* --------------------- REPRESENTATIVE --------------------- */}
          <Card title={t("con.currentRep")}>
            {c.representative ? (
              <Link href={`/candidates/${c.representative.slug}`} className="rep-card card-hover">
                <Avatar
                  name={c.representative.fullName}
                  url={c.representative.photoUrl}
                  large
                />
                <div className="grow">
                  <strong className="rep-name">{c.representative.fullName}</strong>
                  <div className="small muted">
                    {c.representative.party?.name ??
                      (c.representative.isIndependent ? t("cand.independent") : <NotRecorded t={t} />)}
                  </div>
                  {c.representative.office ? (
                    <div className="small">{c.representative.office}</div>
                  ) : null}
                  {c.currentContest?.winner ? (
                    <div className="rep-result small">
                      {c.currentContest.electionName} ·{" "}
                      {formatCount(c.currentContest.winner.votes, locale)} {t("res.votes")}
                      {c.currentContest.margin !== null ? (
                        <>
                          {" · "}
                          {t("con.winMargin")} {formatCount(c.currentContest.margin, locale)}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <VerifiedBadge tier={c.representative.tier} t={t} />
              </Link>
            ) : (
              <Unavailable t={t} title={t("con.noRep")} hint={t("con.noRepHint")} />
            )}
          </Card>

          {/* ------------------------- TREND -------------------------- */}
          <Card title={t("con.trend")}>
            {trend.length < 2 ? (
              <p className="small muted">{t("con.noTrend")}</p>
            ) : (
              <TrendChart
                points={trend}
                labels={{
                  winner: t("con.trendWinner"),
                  turnout: t("con.trendTurnout"),
                  noTrend: t("con.noTrend"),
                }}
              />
            )}
          </Card>

          {/* -------------------- ELECTION HISTORY -------------------- */}
          <Card title={t("con.electionHistory")}>
            {c.contests.length === 0 ? (
              <Unavailable t={t} title={t("con.noHistory")} hint={t("con.noHistoryHint")} />
            ) : (
              <ContestHistory t={t} locale={locale} contests={c.contests} />
            )}
          </Card>

          {/* ------------------------ CANDIDATES ---------------------- */}
          <Card
            title={t("con.candidateList")}
            action={
              c.candidates.length > 1 ? (
                <Link className="small" href={`/compare?constituency=${c.slug}`}>
                  {t("cand.compare")}
                </Link>
              ) : null
            }
          >
            {c.candidates.length === 0 ? (
              <Unavailable t={t} title={t("con.noCandidates")} hint={t("con.noCandidatesHint")} />
            ) : (
              <div className="grid grid-2">
                {c.candidates.map((cand) => {
                  const n = cand.ratings.length;
                  const avg =
                    n === 0 ? 0 : cand.ratings.reduce((s, r) => s + r.weightedScore, 0) / n;
                  return (
                    <Link
                      key={cand.id}
                      className="card card-tight card-hover row"
                      href={`/candidates/${cand.slug}`}
                    >
                      <Avatar name={cand.fullName} url={cand.photoUrl} />
                      <div className="grow">
                        <strong>{cand.fullName}</strong>
                        <div className="small muted">
                          {cand.party?.name ??
                            (cand.isIndependent ? t("cand.independent") : <NotRecorded t={t} />)}
                        </div>
                        {n > 0 ? (
                          <span className="row small">
                            <Stars value={avg} />
                            <span className="faint">{avg.toFixed(1)}</span>
                          </span>
                        ) : (
                          <span className="small faint">{t("cand.noRatings")}</span>
                        )}
                      </div>
                      <VerifiedBadge tier={cand.tier} t={t} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* --------------------------- NEWS ------------------------- */}
          <Card title={t("con.news")}>
            {c.newsArticles.length === 0 ? (
              <Unavailable t={t} title={t("con.noNews")} hint={t("con.noNewsHint")} />
            ) : (
              <div className="stack">
                {c.newsArticles.map((n) => (
                  <article key={n.slug} className="update-row">
                    <Link href={`/news/${n.slug}`} className="update-title">
                      {n.title}
                    </Link>
                    {n.excerpt ? <p className="small muted">{n.excerpt}</p> : null}
                    <span className="small faint">
                      {n.category ? `${n.category} · ` : ""}
                      {formatDate(n.publishedAt)}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </Card>

          {/* ------------------- CIVIC ISSUES / COMPLAINTS ------------ */}
          <Card title={t("con.civic")}>
            {c.issues.length === 0 && c.complaints.length === 0 && !c.majorIssues ? (
              <Unavailable
                t={t}
                title={t("con.noCivic")}
                action={
                  <Link className="btn btn-sm" href="/report">
                    {t("nav.report")}
                  </Link>
                }
              />
            ) : (
              <div className="stack">
                {c.issues.length > 0 ? (
                  <ul className="issue-list">
                    {c.issues.map((i) => (
                      <li key={i.id}>
                        <span className="small">{i.title}</span>
                        <IssueBadge status={i.status} />
                      </li>
                    ))}
                  </ul>
                ) : c.majorIssues ? (
                  <div className="chip-row">
                    {c.majorIssues.split(",").map((i) => (
                      <span className="chip" key={i.trim()}>
                        {i.trim()}
                      </span>
                    ))}
                  </div>
                ) : null}

                {c.complaints.length > 0 ? (
                  <>
                    <hr className="divider" />
                    {c.complaints.map((x) => (
                      <div className="row-between update-row" key={x.trackingId}>
                        <div>
                          <Link href={`/track?id=${x.trackingId}`} className="mono small">
                            {x.trackingId}
                          </Link>
                          <div style={{ fontWeight: 600 }}>{x.title}</div>
                          <div className="small faint">
                            {x.category} · {relativeTime(x.createdAt)}
                          </div>
                        </div>
                        <ComplaintBadge status={x.status} />
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
            )}
          </Card>
        </div>

        {/* ============================ SIDEBAR ========================== */}
        <aside className="stack">
          <Card title={t("con.sources")}>
            {c.sourceName ? (
              <ul className="source-records">
                <li>
                  {c.sourceUrl ? (
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                      {c.sourceName}
                    </a>
                  ) : (
                    c.sourceName
                  )}
                  {c.sourceType ? (
                    <span className="source-field">{enumLabel(c.sourceType, locale)}</span>
                  ) : null}
                </li>
              </ul>
            ) : (
              <Unavailable t={t} title={t("con.noSource")} hint={t("con.noSourceHint")} />
            )}
          </Card>

          <Card title={t("con.pollingStationList")}>
            {c.pollingStations.length === 0 ? (
              <>
                <p className="small muted">{t("con.noPollingStations")}</p>
                {pollingCount > 0 ? (
                  <p className="small faint">
                    {t("con.pollingStations")}: {formatCount(pollingCount, locale)} —{" "}
                    {t("con.pollingCountNote")}
                  </p>
                ) : null}
              </>
            ) : (
              <ul className="source-records">
                {c.pollingStations.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.registeredVoters ? (
                      <span className="faint">
                        {" "}
                        — {formatCount(s.registeredVoters, locale)} {t("con.registeredVoters")}
                      </span>
                    ) : null}
                    {s.address ? <div className="faint small">{s.address}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {c.historicalResults.length > 0 ? (
            <Card title={t("con.previousWinners")}>
              <ul className="timeline">
                {c.historicalResults.map((h) => (
                  <li key={h.id} className="is-muted">
                    <div className="when">
                      {t("cand.bs")} {formatCount(h.bsYear, locale)}
                    </div>
                    <div className="what">{h.winnerName}</div>
                    <div className="small muted">
                      {h.winnerAffiliation ?? <NotRecorded t={t} />}
                      {h.margin ? (
                        <>
                          {" · "}
                          {t("con.winMargin")} {formatCount(h.margin, locale)}
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="small faint" style={{ margin: 0 }}>
                {t("con.historicalNote")}
              </p>
            </Card>
          ) : null}

          {c.children.length > 0 ? (
            <Card title={`${t("con.provincialSegments")} (${formatCount(c.children.length, locale)})`}>
              <div className="chip-row">
                {c.children.map((ch) => (
                  <Link key={ch.slug} className="chip" href={`/constituency/${ch.slug}`}>
                    {ch.name}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {c.promises.length > 0 ? (
            <Card title={t("con.localPromises")}>
              <ul className="source-records">
                {c.promises.map((p) => (
                  <li key={p.id}>{p.title}</li>
                ))}
              </ul>
              <Link className="small" href="/promises">
                {t("common.viewAll")} →
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
