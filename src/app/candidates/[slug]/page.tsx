import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getCandidateProfile, type CandidateProfile } from "@/lib/candidates";
import { Avatar, Badge, Breadcrumb, Card, Meter, Stars } from "@/components/ui";
import { LevelBadge, PromiseBadge, VerdictBadge } from "@/components/status";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { RatingForm } from "@/components/civic-forms";
import { ElectionTimeline } from "@/components/candidate/election-timeline";
import { PerformancePanel } from "@/components/candidate/performance-panel";
import { PromiseSummaryPanel } from "@/components/candidate/promise-summary";
import { ProjectList, ProjectSummaryPanel } from "@/components/candidate/project-panel";
import { StatementList } from "@/components/candidate/statement-list";
import { MediaGallery } from "@/components/candidate/media-gallery";
import { ComplaintList } from "@/components/candidate/complaint-list";
import { ScoreBadge } from "@/components/candidate/score-badge";
import { ProfileTabs, isProfileTab, type ProfileTab } from "@/components/candidate/profile-tabs";
import { Unavailable, NotRecorded } from "@/components/candidate/unavailable";
import { RATING_DIMENSIONS, summarize } from "@/lib/ratings";
import { getTranslator } from "@/lib/locale-server";
import { formatCount, formatYear, type Locale, type Translator } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/format";

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

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  const { t, locale } = await getTranslator();
  const actor = await getActor();

  const c = await getCandidateProfile(slug);
  if (!c) notFound();

  const tab: ProfileTab = isProfileTab(rawTab) ? rawTab : "overview";
  const summary = summarize(c.ratings);
  const ownRating = actor ? c.ratings.find((r) => r.userId === actor.userId) : null;
  const isOwnProfile = actor?.userId === c.accountId;

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

            {/* The Devanagari name is the recognisable one for most of this
                audience, so it sits directly under the Latin spelling in both
                locales rather than only in the Nepali UI. */}
            {c.fullNameNe ? <p className="profile-name-ne">{c.fullNameNe}</p> : null}

            <p className="profile-affiliation">
              {c.party ? c.party.name : c.isIndependent ? t("cand.independent") : t("cand.notRecordedShort")}
              {seatLabel ? <span className="sep"> • </span> : null}
              {seatLabel}
            </p>

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
                    <Link href={`/constituency/${c.constituency.slug}`}>{seatLabel}</Link>
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
              {/* Age is either derived from a recorded birth date, or the age
                  the Election Commission published for a given election —
                  labelled with that election, because it is not today's age
                  and the source never claimed it was. */}
              <div>
                <dt>{t("cand.age")}</dt>
                <dd>
                  {c.ageFact === null ? (
                    <NotRecorded t={t} />
                  ) : c.ageFact.kind === "CURRENT" ? (
                    <>
                      {formatCount(c.ageFact.years, locale)} {t("cand.yearsOld")}
                      <span className="faint small"> · {formatDate(c.ageFact.dateOfBirth)}</span>
                    </>
                  ) : (
                    <span title={t("cand.ageAtElectionNote")}>
                      {formatCount(c.ageFact.years, locale)} {t("cand.yearsOld")}
                      <span className="faint small">
                        {" · "}
                        {t("cand.ageAtElection")}{" "}
                        {formatYear(c.ageFact.bsYear ?? c.ageFact.electionYear, locale)}
                      </span>
                    </span>
                  )}
                </dd>
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

          {/* The score and the public rating sit side by side and are labelled
              as different kinds of thing. They are never combined — see
              src/lib/accountability.ts and docs/ARCHITECTURE.md. */}
          <div className="profile-scores">
            <ScoreBadge score={c.score} t={t} locale={locale} />

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
              <div className="small faint profile-score-kind">{t("cand.publicOpinion")}</div>
            </div>
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

        <ProfileTabs
          slug={c.slug}
          active={tab}
          t={t}
          locale={locale}
          counts={{
            promises: c.promises.length,
            projects: c.projects.length,
            parliament: c.performance.length,
            facts: c.factChecks.length + c.statements.length,
            activity: c.newsArticles.length + c.media.length + c.complaints.length,
          }}
        />
      </Card>

      <div className="grid grid-sidebar profile-grid">
        <div className="stack">
          {tab === "overview" ? <OverviewTab c={c} t={t} locale={locale} /> : null}
          {tab === "promises" ? <PromisesTab c={c} t={t} locale={locale} /> : null}
          {tab === "projects" ? <ProjectsTab c={c} t={t} locale={locale} /> : null}
          {tab === "parliament" ? <ParliamentTab c={c} t={t} locale={locale} /> : null}
          {tab === "facts" ? <FactsTab c={c} t={t} locale={locale} /> : null}
          {tab === "activity" ? <ActivityTab c={c} t={t} locale={locale} /> : null}
        </div>

        {/* ====================== PERSISTENT SIDEBAR ====================== */}
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

// ------------------------------------------------------------------ the tabs

type TabProps = { c: CandidateProfile; t: Translator; locale: Locale };

function OverviewTab({ c, t, locale }: TabProps) {
  // Education is published only when a source cites it. The field can hold a
  // value that no source backs; showing it anyway would be exactly the kind of
  // unattributed claim this platform exists to avoid.
  const showEducation = Boolean(c.education) && c.trust.education.verified;
  const educationWithheld = Boolean(c.education) && !c.trust.education.verified;
  const socialLinks = (c.socialLinks as Record<string, string> | null) ?? null;

  return (
    <>
      <div className="profile-stats">
        <SummaryStat
          label={t("cand.pTotal")}
          value={
            c.promiseSummary.total > 0
              ? `${formatCount(c.promiseSummary.completed, locale)}/${formatCount(c.promiseSummary.total, locale)}`
              : "—"
          }
          hint={t("cand.pCompletedShare")}
        />
        <SummaryStat
          label={t("cand.prjTotal")}
          value={
            c.projectSummary.total > 0
              ? `${formatCount(c.projectSummary.completed, locale)}/${formatCount(c.projectSummary.total, locale)}`
              : "—"
          }
          hint={t("cand.prjCompletedShare")}
        />
        <SummaryStat
          label={t("cand.scoreParliament")}
          value={
            c.score.components.parliament.score === null
              ? "—"
              : `${formatCount(Math.round(c.score.components.parliament.score), locale)}%`
          }
          hint={t("cand.mAttendance")}
        />
        <SummaryStat
          label={t("cand.electionHistory")}
          value={c.history.length > 0 ? formatCount(c.history.length, locale) : "—"}
          hint={t("cand.contestsRecorded")}
        />
      </div>

      <Card title={t("cand.profile")}>
        <dl className="kv">
          <dt>{t("cand.biography")}</dt>
          <dd>{c.biography ?? <NotRecorded t={t} />}</dd>

          {c.fullNameNe ? (
            <>
              <dt>{t("cand.nepaliName")}</dt>
              <dd>{c.fullNameNe}</dd>
            </>
          ) : null}

          <dt>{t("cand.dateOfBirth")}</dt>
          <dd>
            {c.dateOfBirth ? (
              <>
                {formatDate(c.dateOfBirth)}
                {c.age !== null ? (
                  <span className="faint">
                    {" "}
                    · {formatCount(c.age, locale)} {t("cand.yearsOld")}
                  </span>
                ) : null}
              </>
            ) : c.ageFact?.kind === "AT_ELECTION" ? (
              // No birth date on file. Say what the Commission actually
              // published rather than back-computing a year from the age,
              // which would invent a fact to within a twelve-month window.
              <>
                <NotRecorded t={t} />
                <span className="faint small">
                  {" · "}
                  {formatCount(c.ageFact.years, locale)} {t("cand.yearsOld")}{" "}
                  {t("cand.ageAtElection")}{" "}
                  {formatYear(c.ageFact.bsYear ?? c.ageFact.electionYear, locale)}
                </span>
              </>
            ) : (
              <NotRecorded t={t} />
            )}
          </dd>

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

      <Card title={t("cand.electionHistory")}>
        {c.history.length === 0 ? (
          <Unavailable t={t} title={t("cand.historyEmpty")} hint={t("cand.historyEmptyHint")} />
        ) : (
          <ElectionTimeline t={t} locale={locale} entries={c.history} />
        )}
      </Card>

      {/* A short strip rather than the full gallery: the activity tab holds
          everything, this is the "recent" cut the reader sees first. */}
      {c.media.length > 0 ? (
        <Card title={t("cand.mediaEvidence")}>
          <MediaGallery t={t} locale={locale} media={c.media.slice(0, 6)} />
          {c.media.length > 6 ? (
            <Link className="small" href={`/candidates/${c.slug}?tab=activity`}>
              {t("cand.tabActivity")} →
            </Link>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

function PromisesTab({ c, t, locale }: TabProps) {
  return (
    <Card title={t("cand.commitments")}>
      {c.promises.length === 0 ? (
        <Unavailable t={t} title={t("cand.promisesEmpty")} hint={t("cand.promisesEmptyHint")} />
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
                {c.promises.map((p) => (
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
  );
}

function ProjectsTab({ c, t, locale }: TabProps) {
  return (
    <Card title={t("cand.projects")}>
      {c.projects.length === 0 ? (
        <Unavailable t={t} title={t("cand.projectsEmpty")} hint={t("cand.projectsEmptyHint")} />
      ) : (
        <>
          <ProjectSummaryPanel t={t} locale={locale} summary={c.projectSummary} />
          <hr className="divider" />
          <ProjectList t={t} locale={locale} projects={c.projects} />
        </>
      )}
    </Card>
  );
}

function ParliamentTab({ c, t, locale }: TabProps) {
  return (
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
  );
}

function FactsTab({ c, t, locale }: TabProps) {
  return (
    <>
      <Card title={t("cand.statements")}>
        {c.statements.length === 0 ? (
          <Unavailable
            t={t}
            title={t("cand.statementsEmpty")}
            hint={t("cand.statementsEmptyHint")}
          />
        ) : (
          <StatementList t={t} locale={locale} statements={c.statements} />
        )}
      </Card>

      <Card title={t("cand.factChecks")}>
        {c.factChecks.length === 0 ? (
          <Unavailable t={t} title={t("cand.newsEmpty")} hint={t("cand.newsEmptyHint")} />
        ) : (
          <div className="stack">
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
          </div>
        )}
      </Card>
    </>
  );
}

function ActivityTab({ c, t, locale }: TabProps) {
  return (
    <>
      <Card title={t("cand.news")}>
        {c.newsArticles.length === 0 ? (
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
          </div>
        )}
      </Card>

      <Card title={t("cand.mediaEvidence")}>
        {c.media.length === 0 ? (
          <Unavailable t={t} title={t("cand.mediaEmpty")} hint={t("cand.mediaEmptyHint")} />
        ) : (
          <MediaGallery t={t} locale={locale} media={c.media} />
        )}
      </Card>

      <Card title={t("cand.complaints")}>
        {c.complaints.length === 0 ? (
          <Unavailable
            t={t}
            title={t("cand.complaintsEmpty")}
            hint={t("cand.complaintsEmptyHint")}
          />
        ) : (
          <ComplaintList t={t} locale={locale} complaints={c.complaints} />
        )}
      </Card>
    </>
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
