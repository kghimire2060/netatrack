import Link from "next/link";
import { getDashboard } from "@/lib/dashboard";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel, formatCount, localizeDigits, type TranslationKey } from "@/lib/i18n";
import { Avatar } from "@/components/ui";
import { ComplaintBadge, PromiseBadge } from "@/components/status";
import { AnimatedCounter } from "@/components/dashboard/counter";
import { ElectionCountdown } from "@/components/dashboard/countdown";
import { SourceLine, TrustBar, VerifiedBadge } from "@/components/dashboard/trust";
import { BarList, Gauge, ScoreRows, SentimentBar } from "@/components/dashboard/charts";
import { ConstituencyPulse } from "@/components/dashboard/constituency-pulse";
import { PeopleIcon, PinIcon, DocIcon, ChartIcon, SearchIcon } from "@/components/icons";
import { formatDate, relativeTime } from "@/lib/format";
import type { ReactNode } from "react";

const KPI_META: Record<string, { label: TranslationKey; hint: TranslationKey; icon: ReactNode; tint: string }> = {
  leaders: { label: "kpi.leaders", hint: "kpi.leadersHint", icon: <PeopleIcon size={20} />, tint: "" },
  constituencies: { label: "kpi.constituencies", hint: "kpi.constituenciesHint", icon: <PinIcon size={20} />, tint: "red" },
  commitments: { label: "kpi.commitments", hint: "kpi.commitmentsHint", icon: <DocIcon size={20} />, tint: "purple" },
  opinions: { label: "kpi.opinions", hint: "kpi.opinionsHint", icon: <ChartIcon size={20} />, tint: "green" },
};

export default async function HomePage() {
  const { t, locale } = await getTranslator();
  const d = await getDashboard();

  return (
    <div className="dash">
      {/* ============================ HERO ============================ */}
      <section className="dash-hero">
        <div className="dash-hero-glow" aria-hidden />
        <div className="wrap">
          <div className="dash-hero-grid">
            <div>
              <span className="pill-live">
                <span className="pulse-ring" aria-hidden />
                {t("dash.eyebrow")}
              </span>
              <h1 className="dash-title">{t("dash.headline")}</h1>
              <p className="dash-lede">{t("dash.sub")}</p>
              <div className="row" style={{ gap: ".6rem", marginTop: "1.4rem" }}>
                <Link href="/candidates" className="btn btn-lg">
                  {t("dash.explore")} <SearchIcon size={16} />
                </Link>
                <Link href="/track" className="btn btn-lg btn-ghost">
                  {t("dash.trackIssue")}
                </Link>
              </div>
            </div>

            <div className="election-card">
              {d.nextEvent?.startsAt ? (
                <>
                  <div className="countdown-head">
                    <span className="badge badge-bad">{t("sec.countdown")}</span>
                    <VerifiedBadge state="verified" t={t} />
                  </div>
                  <h3 className="countdown-title">{d.nextEvent.title}</h3>
                  <div className="small faint">
                    {d.nextEvent.election.name}
                    {d.nextEvent.bsDate ? ` · ${d.nextEvent.bsDate}` : ""}
                  </div>
                  <ElectionCountdown
                    targetIso={d.nextEvent.startsAt.toISOString()}
                    labels={{
                      days: t("cd.days"), hours: t("cd.hours"),
                      minutes: t("cd.minutes"), seconds: t("cd.seconds"), passed: t("cd.passed"),
                    }}
                  />
                  <SourceLine
                    t={t}
                    sourceName={d.nextEvent.sourceName}
                    sourceUrl={d.nextEvent.sourceUrl}
                    verifiedAt={null}
                  />
                </>
              ) : d.election ? (
                <>
                  <div className="countdown-head">
                    <span className="badge badge-navy">{t("trust.latestElection")}</span>
                    <VerifiedBadge state="verified" t={t} />
                  </div>
                  <h3 className="countdown-title">{d.election.name}</h3>
                  <dl className="election-facts">
                    <div>
                      <dt>{t("trust.pollingDay")}</dt>
                      <dd>{formatDate(d.election.electionDate)}</dd>
                    </div>
                    <div>
                      <dt>{t("trust.seats")}</dt>
                      <dd>{formatCount(d.election.totalSeats, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t("trust.fptp")} / {t("trust.pr")}</dt>
                      <dd>
                        {formatCount(d.election.fptpSeats, locale)} / {formatCount(d.election.prSeats, locale)}
                      </dd>
                    </div>
                  </dl>
                  <div className="badge badge-good" style={{ marginBottom: ".5rem" }}>
                    {t("trust.countingDone")}
                  </div>
                  <p className="small muted" style={{ margin: "0 0 .5rem" }}>{t("trust.noResultsHeld")}</p>
                  <SourceLine
                    t={t}
                    sourceName={d.election.sourceName}
                    sourceUrl={d.election.sourceUrl}
                    verifiedAt={d.election.verifiedAt}
                  />
                </>
              ) : (
                <>
                  <VerifiedBadge state="unverified" t={t} />
                  <p className="small muted" style={{ marginTop: ".6rem" }}>
                    {t("trust.noVerifiedElection")}
                  </p>
                </>
              )}
            </div>
          </div>

        </div>
      </section>

      <div className="wrap">
        {/* ---------------------------- KPI row --------------------------- */}
        <div className="kpi-row">
          {d.kpis.map((k) => {
            const m = KPI_META[k.key];
            return (
              <Link key={k.key} href={k.href} className="kpi">
                <span className={`icon-tile ${m.tint}`}>{m.icon}</span>
                <span className="kpi-body">
                  <AnimatedCounter value={k.value} className="kpi-value" />
                  <span className="kpi-label">{t(m.label)}</span>
                  <span className="kpi-hint">{t(m.hint)}</span>
                </span>
              </Link>
            );
          })}
        </div>
        <TrustBar
          t={t}
          election={d.election}
          lastUpdated={d.freshness.lastUpdated}
          candidatesVerified={d.freshness.candidatesVerified}
          candidatesPending={d.freshness.candidatesPending}
        />
      </div>

      <div className="wrap dash-body">
        {/* ========================= TRENDING LEADERS ===================== */}
        <Section title={t("sec.trending")} sub={t("sec.trendingSub")} href="/candidates" more={t("common.viewAll")}>
          {d.trending.length === 0 ? (
            <Empty title={t("common.noResults")} />
          ) : (
            <div className="leader-grid">
              {d.trending.map((l, rank) => (
                <Link key={l.id} href={`/candidates/${l.slug}`} className="leader-card" data-party={l.partyIndex}>
                  <span className="leader-rank">{localizeDigits(String(rank + 1), locale)}</span>
                  <Avatar name={l.fullName} url={l.photoUrl} />
                  <div className="leader-main">
                    <strong className="leader-name">{l.fullName}</strong>
                    <div className="leader-meta">
                      {l.party ? <span className="party-chip">{l.party}</span> : null}
                      <span className="faint">{l.constituency ?? l.district ?? "—"}</span>
                    </div>
                    {l.office ? <div className="leader-office">{l.office}</div> : null}
                    <div className="leader-stats">
                      <span className="basis">{t(`basis.${l.basis}` as TranslationKey)}</span>
                      {l.ratingCount > 0 ? (
                        <span className="stat-chip">★ {localizeDigits(l.ratingAverage.toFixed(1), locale)}</span>
                      ) : null}
                      {l.promiseTotal > 0 ? (
                        <span className="stat-chip">
                          {localizeDigits(`${l.promiseDone}/${l.promiseTotal}`, locale)}
                        </span>
                      ) : null}
                      {l.factChecks > 0 ? (
                        <span className="stat-chip">{formatCount(l.factChecks, locale)} ✓</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* ======================== CONSTITUENCY PULSE ==================== */}
        <Section title={t("sec.pulse")} sub={t("sec.pulseSub")} href="/constituencies" more={t("common.viewAll")}>
          <ConstituencyPulse
            provinces={d.pulse}
            labels={{
              seats: t("pulse.seats"), candidates: t("pulse.candidates"), issues: t("pulse.issues"),
              voters: t("pulse.voters"), explore: t("pulse.explore"), districts: t("pulse.districts"),
              federal: t("pulse.federal"), provincial: t("pulse.provincial"),
              local: t("con.local"), pick: t("pulse.pick"),
            }}
          />
        </Section>

        {/* =============== PUBLIC OPINION + COMMITMENT TRACKER ============ */}
        <div className="dash-split">
          <Section title={t("sec.opinion")} sub={t("sec.opinionSub")} href="/opinion" more={t("common.viewAll")}>
            {d.opinion.totalRatings === 0 ? (
              <Empty
                title={t("op.noData")}
                hint={t("op.noDataHint")}
                action={<Link className="btn btn-sm" href="/candidates">{t("op.beFirst")}</Link>}
              />
            ) : (
              <>
                <div className="opinion-head">
                  <div>
                    <div className="hero-figure">{localizeDigits(d.opinion.average.toFixed(1), locale)}</div>
                    <div className="small faint">{t("op.avgRating")} · {formatCount(d.opinion.totalRatings, locale)}</div>
                  </div>
                  <div className="grow">
                    <SentimentBar
                      slices={d.opinion.sentiment}
                      labels={{ positive: t("sent.positive"), neutral: t("sent.neutral"), negative: t("sent.negative") }}
                    />
                  </div>
                </div>
                <div className="pulse-sub">{t("op.dimensions")}</div>
                <ScoreRows rows={d.opinion.dimensions} />
              </>
            )}
          </Section>

          <Section title={t("sec.commitments")} sub={t("sec.commitmentsSub")} href="/promises" more={t("common.viewAll")}>
            {d.commitments.total === 0 ? (
              <Empty
                title={t("cm.noData")}
                hint={t("cm.noDataHint")}
                action={<Link className="btn btn-sm btn-ghost" href="/promises">{t("cm.browse")}</Link>}
              />
            ) : (
              <div className="commit-grid">
                <Gauge
                  value={d.commitments.completionRate}
                  label={t("cm.completionRate")}
                  sub={`${formatCount(d.commitments.withEvidence, locale)} ${t("cm.withEvidence")}`}
                />
                <div className="grow">
                  <BarList
                    rows={d.commitments.byStatus.map((s) => ({
                      key: s.status,
                      label: enumLabel(s.status, locale),
                      value: s.count,
                    }))}
                  />
                  {d.commitments.recent.length > 0 ? (
                    <>
                      <div className="pulse-sub">{t("cm.recent")}</div>
                      <ul className="mini-list">
                        {d.commitments.recent.map((p) => (
                          <li key={p.id}>
                            <span className="grow">{p.title}</span>
                            <PromiseBadge status={p.status as never} />
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ========================= POLITICAL RADAR ====================== */}
        <Section title={t("sec.radar")} sub={t("sec.radarSub")}>
          {d.radar.length === 0 ? (
            <Empty title={t("radar.noData")} />
          ) : (
            <div className="radar">
              {d.radar.map((item) => (
                <Link key={item.id} href={item.href} className={`radar-row tone-${item.tone}`}>
                  <span className="radar-kind">{t(`radar.${item.kind}` as TranslationKey)}</span>
                  <span className="radar-title">
                    {item.title}
                    {item.age === "historical" ? (
                      <span className="radar-historical">{t("trust.historical")}</span>
                    ) : null}
                  </span>
                  <span className="radar-meta faint">
                    {item.meta ? `${item.meta} · ` : ""}
                    {item.at.getTime() > 0 ? formatDate(item.at) : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <p className="small faint center" style={{ maxWidth: "62ch", margin: "0 auto 2rem" }}>
          {t("notice.notAuthority")}
        </p>
      </div>
    </div>
  );
}

function Section({
  title, sub, href, more, children,
}: {
  title: string; sub?: string; href?: string; more?: string; children: ReactNode;
}) {
  return (
    <section className="dash-section">
      <header className="dash-section-head">
        <div>
          <h2>{title}</h2>
          {sub ? <p className="dash-section-sub">{sub}</p> : null}
        </div>
        {href && more ? (
          <Link className="dash-more" href={href}>
            {more} <span aria-hidden>›</span>
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="dash-empty">
      <strong>{title}</strong>
      {hint ? <p className="small muted">{hint}</p> : null}
      {action}
    </div>
  );
}
