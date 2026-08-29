import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/locale-server";
import { formatCount, type Locale, type Translator } from "@/lib/i18n";
import { Avatar, Badge, Card, Meter, Stars } from "@/components/ui";
import { ComplaintBadge, ElectionBadge } from "@/components/status";
import { TrackLookup } from "@/components/civic-forms";
import {
  CalendarIcon,
  ChartIcon,
  DocIcon,
  NewsIcon,
  PeopleIcon,
  PinIcon,
  ProfileSearchIcon,
  SearchIcon,
  SpeechIcon,
} from "@/components/icons";
import { formatDate, relativeTime } from "@/lib/format";
import type { ReactNode } from "react";

/** Home page — matches the supplied design: light hero, stat strip, features. */
export default async function HomePage() {
  const { t, locale } = await getTranslator();

  const [
    candidateCount,
    constituencyCount,
    promiseCount,
    opinionCount,
    activeElection,
    topCandidates,
    latestNews,
    openIssues,
    upcomingEvents,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.constituency.count({ where: { level: "FEDERAL" } }),
    prisma.promise.count(),
    prisma.rating.count({ where: { status: "VISIBLE" } }).then(async (ratings) =>
      ratings + (await prisma.pollVote.count())
    ),
    prisma.election.findFirst({
      where: { status: { in: ["ACTIVE", "COUNTING", "UPCOMING"] } },
      orderBy: [{ status: "asc" }, { electionDate: "asc" }],
      select: { name: true, slug: true, status: true, electionDate: true, totalSeats: true },
    }),
    prisma.candidate.findMany({
      where: { OR: [{ isIncumbent: true }, { office: { not: null } }, { ratings: { some: { status: "VISIBLE" } } }] },
      take: 6,
      orderBy: [{ isIncumbent: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        slug: true,
        fullName: true,
        photoUrl: true,
        office: true,
        party: { select: { shortName: true, name: true } },
        constituency: { select: { name: true } },
        ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
        promises: { select: { status: true } },
      },
    }),
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, excerpt: true, category: true, publishedAt: true, views: true },
    }),
    prisma.complaint.findMany({
      where: { status: { notIn: ["CLOSED"] } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { trackingId: true, title: true, status: true, category: true, updatedAt: true },
    }),
    prisma.electionEvent.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 4,
      select: { id: true, title: true, startsAt: true, bsDate: true, election: { select: { name: true } } },
    }),
  ]);

  const ranked = topCandidates
    .map((candidate) => {
      const count = candidate.ratings.length;
      const done = candidate.promises.filter((p) => p.status === "COMPLETED").length;
      return {
        ...candidate,
        ratingCount: count,
        average: count === 0 ? 0 : candidate.ratings.reduce((s, r) => s + r.weightedScore, 0) / count,
        promiseCount: candidate.promises.length,
        progress: candidate.promises.length === 0 ? 0 : Math.round((done / candidate.promises.length) * 100),
      };
    })
    .slice(0, 3);

  return (
    <>
      {/* ------------------------------- hero ------------------------------ */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              <span className="dot" />
              {t("home.welcome")}
            </span>
            <h1>
              <Headline t={t} />
            </h1>
            <p className="lede">{t("home.subhead")}</p>

            <div className="hero-cta">
              <Link href="/candidates" className="btn btn-lg btn-navy">
                {t("home.ctaCandidates")}
                <SearchIcon size={17} />
              </Link>
              <Link href="/constituencies" className="btn btn-lg btn-ghost">
                {t("home.ctaConstituencies")}
                <PinIcon size={17} />
              </Link>
            </div>

            <div style={{ marginTop: "1.4rem", maxWidth: "430px" }}>
              <TrackLookup />
              <p className="small faint" style={{ margin: ".45rem 0 0" }}>
                {t("home.trackPrompt")}
              </p>
            </div>
          </div>

          <div className="hero-art" aria-hidden>
            <HeroArt />
          </div>
        </div>
      </section>

      {/* ---------------------------- stat strip --------------------------- */}
      <div className="wrap">
        <div className="stat-strip">
          <StatCell
            icon={<PeopleIcon />}
            tint=""
            label={t("stat.candidates")}
            value={formatCount(candidateCount, locale)}
            hint={t("stat.candidatesHint")}
          />
          <StatCell
            icon={<PinIcon size={22} />}
            tint="red"
            label={t("stat.constituencies")}
            value={formatCount(constituencyCount, locale)}
            hint={t("stat.constituenciesHint")}
          />
          <StatCell
            icon={<DocIcon />}
            tint="purple"
            label={t("stat.promises")}
            value={formatCount(promiseCount, locale)}
            hint={t("stat.promisesHint")}
          />
          <StatCell
            icon={<ChartIcon />}
            tint="green"
            label={t("stat.opinion")}
            value={formatCount(opinionCount, locale)}
            hint={t("stat.opinionHint")}
          />
        </div>
      </div>

      {/* ----------------------------- features ---------------------------- */}
      <section className="wrap section">
        <div className="section-heading">
          <h2>{t("features.title")}</h2>
          <div className="rule" />
        </div>
        <div className="grid grid-5">
          <Feature href="/candidates" tint="" icon={<ProfileSearchIcon />} title={t("features.profiles")} body={t("features.profilesBody")} />
          <Feature href="/promises" tint="red" icon={<ChartIcon />} title={t("features.promises")} body={t("features.promisesBody")} />
          <Feature href="/opinion" tint="purple" icon={<SpeechIcon />} title={t("features.opinion")} body={t("features.opinionBody")} />
          <Feature href="/calendar" tint="green" icon={<CalendarIcon />} title={t("features.calendar")} body={t("features.calendarBody")} />
          <Feature href="/news" tint="orange" icon={<NewsIcon />} title={t("features.news")} body={t("features.newsBody")} />
        </div>
      </section>

      {/* --------------------- news + popular candidates ------------------- */}
      <section className="wrap section-tight">
        <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)", gap: "1.2rem" }}>
          <Card
            title={t("home.latestNews")}
            action={
              <Link className="small" href="/news">
                {t("home.viewAll")} ›
              </Link>
            }
          >
            {latestNews.length === 0 ? (
              <p className="small muted">{t("common.noResults")}</p>
            ) : (
              <div className="stack">
                {latestNews.map((article) => (
                  <article key={article.slug}>
                    {article.category ? <Badge tone="bad">{article.category}</Badge> : null}
                    <h3 style={{ margin: ".35rem 0 .2rem", fontSize: ".97rem" }}>
                      <Link href={`/news/${article.slug}`}>{article.title}</Link>
                    </h3>
                    {article.excerpt ? (
                      <p className="small muted" style={{ margin: 0 }}>
                        {article.excerpt}
                      </p>
                    ) : null}
                    <div className="small faint" style={{ marginTop: ".25rem" }}>
                      {formatDate(article.publishedAt)} · {formatCount(article.views, locale)}{" "}
                      {t("common.views")}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t("home.popularCandidates")}
            action={
              <Link className="small" href="/candidates">
                {t("home.viewAll")} ›
              </Link>
            }
          >
            {ranked.length === 0 ? (
              <p className="small muted">{t("common.noResults")}</p>
            ) : (
              <div className="grid grid-3">
                {ranked.map((candidate) => (
                  <Link key={candidate.id} href={`/candidates/${candidate.slug}`} className="card card-tight card-hover">
                    <div className="candidate-card">
                      <Avatar name={candidate.fullName} url={candidate.photoUrl} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: ".92rem" }}>{candidate.fullName}</strong>
                        <div className="meta">{candidate.office ?? t("common.candidateFor")}</div>
                        <div className="meta">
                          {candidate.constituency?.name ?? candidate.party?.name ?? t("common.independent")}
                        </div>
                      </div>
                    </div>
                    <hr className="divider" style={{ margin: ".7rem 0 .5rem" }} />
                    <div className="progress-row">
                      <span className="muted">
                        {t("common.commitments")} {formatCount(candidate.promiseCount, locale)}
                      </span>
                      <strong style={{ color: "var(--green)" }}>
                        {formatCount(candidate.progress, locale)}% {t("common.progress")}
                      </strong>
                    </div>
                    <Meter value={candidate.progress} tone={candidate.progress >= 60 ? "good" : "warn"} />
                    {candidate.ratingCount > 0 ? (
                      <div className="row small" style={{ marginTop: ".45rem" }}>
                        <Stars value={candidate.average} />
                        <span className="faint">
                          {candidate.average.toFixed(1)} · {formatCount(candidate.ratingCount, locale)}{" "}
                          {t("common.ratings")}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
            <p className="small faint" style={{ margin: ".9rem 0 0" }}>
              {t("notice.opinionOnly")} <Link href="/methodology">{t("notice.methodology")}</Link>
            </p>
          </Card>
        </div>
      </section>

      {/* ------------------------ election + issues ------------------------ */}
      <section className="wrap section-tight" style={{ paddingBottom: "2.4rem" }}>
        <div className="grid grid-3">
          {activeElection ? (
            <Card title={t("home.currentElection")} action={<ElectionBadge status={activeElection.status} />}>
              <h3 style={{ marginBottom: ".2rem" }}>{activeElection.name}</h3>
              <p className="small muted">
                {activeElection.electionDate ? formatDate(activeElection.electionDate) : "—"}
                {activeElection.totalSeats
                  ? ` · ${formatCount(activeElection.totalSeats, locale)}`
                  : ""}
              </p>
              <Link className="btn btn-sm btn-ghost" href={`/elections/${activeElection.slug}`}>
                {t("home.openElection")}
              </Link>
            </Card>
          ) : null}

          <Card title={t("home.recentIssues")}>
            {openIssues.length === 0 ? (
              <p className="small muted">{t("common.noResults")}</p>
            ) : (
              <div className="stack">
                {openIssues.map((issue) => (
                  <div key={issue.trackingId}>
                    <Link href={`/track?id=${issue.trackingId}`} className="mono small">
                      {issue.trackingId}
                    </Link>
                    <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{issue.title}</div>
                    <div className="row small faint">
                      <ComplaintBadge status={issue.status} />
                      <span>{relativeTime(issue.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link className="btn btn-sm btn-block" href="/report" style={{ marginTop: ".8rem" }}>
              {t("nav.report")}
            </Link>
          </Card>

          <Card title={t("home.upcoming")}>
            {upcomingEvents.length === 0 ? (
              <p className="small muted">{t("common.noResults")}</p>
            ) : (
              <ul className="timeline">
                {upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <div className="when">{event.bsDate ?? formatDate(event.startsAt)}</div>
                    <div className="what" style={{ fontSize: ".9rem" }}>
                      {event.title}
                    </div>
                    <div className="small muted">{event.election.name}</div>
                  </li>
                ))}
              </ul>
            )}
            <Link className="small" href="/calendar">
              {t("home.viewAll")} ›
            </Link>
          </Card>
        </div>
      </section>
    </>
  );
}

/** Renders the headline with its final phrase in the accent colour. */
function Headline({ t }: { t: Translator }) {
  const full = t("home.headline");
  const accent = t("home.headlineAccent");
  const at = full.lastIndexOf(accent);
  if (at === -1) return <>{full}</>;
  return (
    <>
      {full.slice(0, at)}
      <em>{accent}</em>
      {full.slice(at + accent.length)}
    </>
  );
}

function StatCell({
  icon,
  tint,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  tint: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="stat-cell">
      <span className={`icon-tile ${tint}`}>{icon}</span>
      <span>
        <span className="label">{label}</span>
        <span className="value" style={{ display: "block" }}>
          {value}
        </span>
        <span className="hint">{hint}</span>
      </span>
    </div>
  );
}

function Feature({
  href,
  icon,
  tint,
  title,
  body,
}: {
  href: string;
  icon: ReactNode;
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="feature-card">
      <span className={`icon-tile ${tint}`}>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </Link>
  );
}

/** Decorative hero illustration: Himalaya, temple silhouettes, data lens. */
function HeroArt() {
  return (
    <svg viewBox="0 0 420 320" width="100%" height="auto" role="presentation">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tint-blue)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fbde4" />
          <stop offset="100%" stopColor="#c9dbf1" />
        </linearGradient>
      </defs>
      <circle cx="220" cy="150" r="145" fill="url(#sky)" />
      <path d="M20 250 90 150l42 58 38-52 62 94H20Z" fill="url(#ridge)" />
      <path d="M90 150l30 42h-60l30-42Z" fill="#fff" opacity=".85" />
      <path d="M170 156l24 34h-48l24-34Z" fill="#fff" opacity=".7" />
      {/* temple silhouettes */}
      <g fill="#1d5fa7" opacity=".55">
        <path d="M232 250v-34h34v34h-34Zm-6-38 23-20 23 20h-46Z" />
        <path d="M280 250v-26h26v26h-26Zm-5-30 18-15 18 15h-36Z" />
        <path d="M196 250v-22h22v22h-22Zm-4-26 15-13 15 13h-30Z" />
      </g>
      <rect x="20" y="248" width="380" height="3" rx="1.5" fill="var(--red)" opacity=".8" />
      {/* data lens */}
      <g transform="translate(258 44)">
        <circle cx="60" cy="60" r="56" fill="#fff" stroke="var(--blue)" strokeWidth="5" />
        <rect x="34" y="66" width="12" height="26" rx="3" fill="var(--blue)" />
        <rect x="54" y="52" width="12" height="40" rx="3" fill="var(--red)" />
        <rect x="74" y="38" width="12" height="54" rx="3" fill="var(--blue)" />
        <circle cx="40" cy="38" r="8" fill="var(--navy)" />
        <circle cx="60" cy="32" r="8" fill="var(--red)" />
        <circle cx="80" cy="38" r="8" fill="var(--navy)" />
        <path d="M100 104l26 26" stroke="var(--blue)" strokeWidth="11" strokeLinecap="round" />
      </g>
    </svg>
  );
}
