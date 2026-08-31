import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getCandidateProfile } from "@/lib/candidates";
import { Avatar, Badge, Breadcrumb, Card, EmptyState, Meter, Stars } from "@/components/ui";
import { LevelBadge, PromiseBadge, VerdictBadge } from "@/components/status";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { RatingForm } from "@/components/civic-forms";
import { ElectionTimeline } from "@/components/candidate/election-timeline";
import { PerformancePanel } from "@/components/candidate/performance-panel";
import { PromiseSummaryPanel } from "@/components/candidate/promise-summary";
import { Unavailable, NotRecorded } from "@/components/candidate/unavailable";
import { RATING_DIMENSIONS, summarize } from "@/lib/ratings";
import { getTranslator } from "@/lib/locale-server";
import { formatCount } from "@/lib/i18n";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getCandidateProfile(slug);
  if (!profile) return { title: "Candidate" };
  const seat = profile.constituency?.name ?? profile.prGroup ?? null;
  return {
    title: profile.fullName,
    description: [profile.fullName, profile.party?.name, seat].filter(Boolean).join(" · "),
  };
}

export default async function CandidatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const actor = await getActor();

  const c = await getCandidateProfile(slug);
  if (!c) notFound();

  const summary = summarize(c.ratings);
  const ownRating = actor ? c.ratings.find((r) => r.userId === actor.userId) : null;
  const isOwnProfile = actor?.userId === c.accountId;
  const socialLinks = (c.socialLinks as Record<string, string> | null) ?? null;

  // Education is published only when a source cites it. The field can hold a
  // value that no source backs; showing it anyway would be exactly the kind of
  // unattributed claim this platform exists to avoid.
  const showEducation = Boolean(c.education) && c.trust.education.verified;
  const educationWithheld = Boolean(c.education) && !c.trust.education.verified;

  const seatLabel = c.constituency
    ? `${c.constituency.name}, ${c.constituency.district}`
    : c.prGroup
      ? t("cand.prMember")
      : null;

  return (
    <div className="wrap section profile">
      <Breadcrumb
        items={[
          { label: t("nav.home"), href: "/" },
          { label: t("cand.title"), href: "/candidates" },
          { label: c.fullName },
        ]}
      />

      {/* ============================ IDENTITY ============================ */}
      <Card className="profile-hero">
        <div className="profile-hero-main">
          <Avatar name={c.fullName} url={c.photoUrl} large />
          <div className="grow">
            <div className="profile-badges">
              <h1>{c.fullName}</h1>
              <VerifiedBadge tier={c.tier} t={t} />
              <LevelBadge level={c.level} />
              {c.isIncumbent ? <Badge tone="navy">{t("cand.incumbent")}</Badge> : null}
              {c.isIndependent ? <Badge tone="muted">{t("cand.independent")}</Badge> : null}
              {c.accountId ? <Badge tone="purple">{t("cand.claimed")}</Badge> : null}
            </div>

            <dl className="profile-identity">
              <div>
                <dt>{t("cand.party")}</dt>
                <dd>
                  {c.party ? c.party.name : c.isIndependent ? t("cand.independent") : <NotRecorded t={t} />}
                </dd>
              </div>
              <div>
                <dt>{t("cand.constituency")}</dt>
                <dd>
                  {c.constituency ? (
                    <Link href={`/constituencies/${c.constituency.slug}`}>{seatLabel}</Link>
                  ) : c.prGroup ? (
                    <span title={t("cand.noSeatHint")}>
                      {t("cand.prMember")} <span className="faint">· {c.prGroup}</span>
                    </span>
                  ) : (
                    <NotRecorded t={t} />
                  )}
                </dd>
              </div>
              <div>
                <dt>{t("cand.province")}</dt>
                <dd>{c.constituency?.province ?? <NotRecorded t={t} />}</dd>
              </div>
              <div>
                <dt>{t("cand.currentPosition")}</dt>
                <dd>{c.office ?? <NotRecorded t={t} />}</dd>
              </div>
            </dl>

            {c.keyIssues ? (
              <div className="chip-row">
                {c.keyIssues.split(",").map((issue) => (
                  <span className="chip" key={issue.trim()}>
                    {issue.trim()}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* An empty star row beside a dash reads as a score of zero, which is
              a claim about the politician. With no ratings, say so in words. */}
          <div className="profile-score">
            {summary.count > 0 ? (
              <>
                <div className="score">
                  {summary.average.toFixed(1)}
                  <small>/5</small>
                </div>
                <Stars value={summary.average} />
                <div className="small faint">
                  {formatCount(summary.count, locale)} {t("cand.ratings")}
                </div>
              </>
            ) : (
              <div className="small faint no-ratings">{t("cand.noRatings")}</div>
            )}
          </div>
        </div>

        <div className="profile-meta">
          <span>
            {t("cand.lastUpdated")}: <strong>{formatDateTime(c.lastUpdated)}</strong>
          </span>
          <span className="profile-completeness">
            {t("cand.dataCompleteness")}:{" "}
            <strong>
              {formatCount(c.completeness.known, locale)} / {formatCount(c.completeness.of, locale)}
            </strong>
            <Meter value={c.completeness.known} max={c.completeness.of} />
          </span>
        </div>
      </Card>

      {/* =========================== SUMMARY STATS ========================= */}
      <div className="profile-stats">
        <SummaryStat
          label={t("cand.electionHistory")}
          value={c.history.length > 0 ? formatCount(c.history.length, locale) : "—"}
          hint={t("cand.contestsRecorded")}
        />
        <SummaryStat
          label={t("cand.pTotal")}
          value={c.promiseSummary.total > 0 ? formatCount(c.promiseSummary.total, locale) : "—"}
          hint={
            c.promiseSummary.completionPct === null
              ? t("cand.notRecordedShort")
              : `${formatCount(Math.round(c.promiseSummary.completionPct), locale)}% ${t("cand.pCompletedShare")}`
          }
        />
        <SummaryStat
          label={t("cand.termsServed")}
          value={c.termsServed === null ? "—" : formatCount(c.termsServed, locale)}
          hint={t("cand.termsHint")}
        />
        <SummaryStat
          label={t("cand.sourcesCount")}
          value={formatCount(c.sources.length, locale)}
          hint={t("cand.sourcesHint")}
        />
      </div>

      <div className="grid grid-sidebar profile-grid">
        <div className="stack">
          {/* ---------------------- BACKGROUND ---------------------- */}
          <Card title={t("cand.profile")}>
            <dl className="kv">
              <dt>{t("cand.biography")}</dt>
              <dd>{c.biography ?? <NotRecorded t={t} />}</dd>

              <dt>{t("cand.education")}</dt>
              <dd>
                {showEducation ? (
                  <>
                    {c.education}
                    {c.trust.education.sources.length > 0 ? (
                      <span className="source-line">
                        {" · "}
                        {c.trust.education.sources.map((s, i) => (
                          <span key={s.label}>
                            {i > 0 ? ", " : ""}
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                                {s.label}
                              </a>
                            ) : (
                              s.label
                            )}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </>
                ) : educationWithheld ? (
                  <span className="withheld">{t("cand.educationUnverified")}</span>
                ) : (
                  <NotRecorded t={t} />
                )}
              </dd>

              <dt>{t("cand.politicalExperience")}</dt>
              <dd>{c.experience ?? <NotRecorded t={t} />}</dd>

              <dt>{t("cand.positions")}</dt>
              <dd>{c.previousPositions ?? <NotRecorded t={t} />}</dd>

              <dt>{t("cand.agenda")}</dt>
              <dd>{c.agenda ?? <NotRecorded t={t} />}</dd>

              {c.termsServed !== null ? (
                <>
                  <dt>{t("cand.termsServed")}</dt>
                  <dd>{formatCount(c.termsServed, locale)}</dd>
                </>
              ) : null}

              {c.prGroup ? (
                <>
                  <dt>{t("cand.prGroup")}</dt>
                  <dd>{c.prGroup}</dd>
                </>
              ) : null}

              {socialLinks
                ? Object.entries(socialLinks).map(([label, url]) => (
                    <div key={label} style={{ display: "contents" }}>
                      <dt>{label}</dt>
                      <dd>
                        <a href={url} rel="noopener noreferrer nofollow" target="_blank">
                          {url}
                        </a>
                      </dd>
                    </div>
                  ))
                : null}
            </dl>
          </Card>

          {/* ------------------- ELECTION HISTORY ------------------- */}
          <Card title={t("cand.electionHistory")}>
            {c.history.length === 0 ? (
              <Unavailable t={t} title={t("cand.historyEmpty")} hint={t("cand.historyEmptyHint")} />
            ) : (
              <ElectionTimeline t={t} locale={locale} entries={c.history} />
            )}
          </Card>

          {/* ---------------------- PERFORMANCE --------------------- */}
          <Card title={t("cand.politicalPerformance")}>
            {c.performance.length === 0 ? (
              <Unavailable
                t={t}
                title={t("cand.performanceEmpty")}
                hint={t("cand.performanceEmptyHint")}
              />
            ) : (
              <>
                <p className="small muted">{t("cand.performanceNote")}</p>
                <PerformancePanel t={t} locale={locale} records={c.performance} />
              </>
            )}
          </Card>

          {/* ---------------------- COMMITMENTS --------------------- */}
          <Card title={t("cand.commitments")}>
            {c.promises.length === 0 ? (
              <Unavailable
                t={t}
                title={t("cand.promisesEmpty")}
                hint={t("cand.promisesEmptyHint")}
              />
            ) : (
              <>
                <PromiseSummaryPanel t={t} locale={locale} summary={c.promiseSummary} />
                <div className="table-wrap" style={{ marginTop: "1rem" }}>
                  <table className="data responsive">
                    <thead>
                      <tr>
                        <th>{t("cand.promise")}</th>
                        <th>{t("cand.status")}</th>
                        <th>{t("cand.evidence")}</th>
                        <th>{t("cand.lastUpdated")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.promises.slice(0, 12).map((p) => (
                        <tr key={p.id}>
                          <td data-label={t("cand.promise")}>{p.title}</td>
                          <td data-label={t("cand.status")}>
                            <PromiseBadge status={p.status} />
                          </td>
                          <td data-label={t("cand.evidence")}>
                            {p.evidenceUrl ? (
                              <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">
                                {t("common.source")}
                              </a>
                            ) : (
                              <NotRecorded t={t} />
                            )}
                          </td>
                          <td data-label={t("cand.lastUpdated")}>{formatDate(p.lastUpdateAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* ------------------------- UPDATES ---------------------- */}
          <Card title={t("cand.news")}>
            {c.newsArticles.length === 0 && c.factChecks.length === 0 ? (
              <Unavailable t={t} title={t("cand.newsEmpty")} hint={t("cand.newsEmptyHint")} />
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

                {c.factChecks.length > 0 ? (
                  <>
                    <hr className="divider" />
                    <h3 className="subhead">{t("cand.factChecks")}</h3>
                    {c.factChecks.map((f) => (
                      <div key={f.slug} className="update-row row-between">
                        <Link href={`/fact-checks/${f.slug}`}>{f.claim}</Link>
                        <span className="row">
                          <VerdictBadge verdict={f.verdict} />
                          <span className="small faint">{formatDate(f.publishedAt)}</span>
                        </span>
                      </div>
                    ))}
                    <p className="small faint" style={{ margin: 0 }}>
                      {t("cand.factCheckNote")}
                    </p>
                  </>
                ) : null}
              </div>
            )}
          </Card>
        </div>

        {/* ============================ SIDEBAR =========================== */}
        <aside className="stack">
          <Card title={t("cand.publicOpinion")}>
            {summary.count === 0 ? (
              <p className="small muted">{t("cand.noRatingsYet")}</p>
            ) : (
              <>
                <div className="row-between">
                  <span className="score">
                    {summary.average.toFixed(1)}
                    <small>/5</small>
                  </span>
                  <span className="small faint">
                    {formatCount(summary.count, locale)} {t("cand.ratings")}
                    <br />
                    {t("cand.lastUpdated")} {formatDateTime(summary.lastUpdated)}
                  </span>
                </div>
                <hr className="divider" />
                {RATING_DIMENSIONS.map((d) => (
                  <div className="bar-row" key={d.key} style={{ marginBottom: ".4rem" }}>
                    <span className="small">{d.label}</span>
                    <Meter value={summary.dimensionAverages[d.key]} max={5} />
                    <span className="small faint">{summary.dimensionAverages[d.key].toFixed(1)}</span>
                  </div>
                ))}
                <hr className="divider" />
                <div className="small muted">{t("cand.distribution")}</div>
                {summary.distribution
                  .map((count, index) => ({ star: index + 1, count }))
                  .reverse()
                  .map((row) => (
                    <div className="bar-row" key={row.star} style={{ marginBottom: ".25rem" }}>
                      <span className="small">{formatCount(row.star, locale)}</span>
                      <Meter value={row.count} max={summary.count} tone="warn" />
                      <span className="small faint">{formatCount(row.count, locale)}</span>
                    </div>
                  ))}
              </>
            )}
            <div className="notice" style={{ marginTop: ".8rem" }}>
              {t("cand.opinionNote")} <Link href="/methodology">{t("nav.methodology")}</Link>
            </div>
          </Card>

          <Card title={ownRating ? t("cand.updateRating") : t("cand.rateThis")}>
            {!actor ? (
              <p className="small muted">
                <Link href="/login">{t("nav.login")}</Link> {t("cand.rateLogin")}
              </p>
            ) : isOwnProfile ? (
              <p className="small muted">{t("cand.rateOwn")}</p>
            ) : (
              <RatingForm
                candidateId={c.id}
                existing={
                  ownRating
                    ? {
                        publicTrust: ownRating.publicTrust,
                        communication: ownRating.communication,
                        localIssueFocus: ownRating.localIssueFocus,
                        policyClarity: ownRating.policyClarity,
                        responsiveness: ownRating.responsiveness,
                        overall: ownRating.overall,
                      }
                    : null
                }
              />
            )}
          </Card>

          {/* Requirement 6: every important factual claim carries a source. */}
          <Card title={t("cand.sources")}>
            {c.sources.length === 0 ? (
              <Unavailable t={t} title={t("cand.noSourceRecords")} hint={t("cand.noSourceHint")} />
            ) : (
              <ul className="source-records">
                {c.sources.map((s) => (
                  <li key={s.id}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                    {s.field ? <span className="source-field">{s.field}</span> : null}
                    {s.note ? <p className="small muted">{s.note}</p> : null}
                    <div className="faint small">{formatDate(s.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {c.documents.length > 0 ? (
            <Card title={t("cand.documents")}>
              <ul className="source-records">
                {c.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.fileUrl} target="_blank" rel="noopener noreferrer nofollow">
                      {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title={t("cand.claimPrompt")}>
            <p className="small muted">{t("cand.claimBody")}</p>
            <Link className="btn btn-sm btn-ghost btn-block" href="/portal/candidate">
              {t("cand.claimCta")}
            </Link>
          </Card>
        </aside>
      </div>

      {/* Requirement 9: stated on every profile, not buried in a footer. */}
      <p className="profile-disclaimer">{t("cand.disclaimer")}</p>
    </div>
  );
}

function SummaryStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="hint">{hint}</div>
    </div>
  );
}
