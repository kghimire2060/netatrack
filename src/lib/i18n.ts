/**
 * Bilingual support. Nepali is the default; English is the fallback.
 *
 * Deliberately a plain dictionary rather than a routing-based i18n library:
 * the locale lives in a cookie, so every URL stays canonical and shareable
 * (a candidate link is the same link in both languages), and no middleware or
 * route restructuring is needed.
 *
 * A missing Nepali key falls back to English rather than rendering the key, so
 * translation can land incrementally without breaking a page.
 */

export const LOCALES = ["ne", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ne";
export const LOCALE_COOKIE = "netatrack_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  ne: "नेपाली",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ne" || value === "en";
}

/** en is the source of truth for available keys; ne overrides it. */
const en = {
  // ---- brand and navigation
  "brand.tagline": "Track · Analyze · Empower",
  "brand.statement": "Know. Vote. Track.",
  "nav.home": "Home",
  "nav.candidates": "Candidates",
  "nav.constituencies": "Constituencies",
  "nav.elections": "Elections",
  "nav.news": "News",
  "nav.opinion": "Public Opinion",
  "nav.calendar": "Calendar",
  "nav.results": "Results",
  "nav.track": "Track an Issue",
  "nav.analytics": "Analytics",
  "nav.about": "About",
  "nav.login": "Log in",
  "nav.register": "Register",
  "nav.logout": "Log out",
  "nav.admin": "Admin",
  "nav.account": "Account",
  "nav.report": "Report an Issue",
  "nav.search": "Search",
  "nav.searchPlaceholder": "Search…",
  "nav.toggleTheme": "Toggle light and dark theme",
  "nav.toggleMenu": "Toggle navigation",
  "nav.language": "Language",
  "nav.notifications": "Notifications",
  "nav.skipToContent": "Skip to main content",

  // ---- home hero
  "home.welcome": "Welcome to NetaTrack",
  "home.headline": "The digital platform connecting leaders, policy and people",
  "home.headlineAccent": "digital platform",
  "home.subhead":
    "Track your representatives, analyse their commitments, and be an informed citizen.",
  "home.ctaCandidates": "Search candidates",
  "home.ctaConstituencies": "View constituencies",

  // ---- home stats
  "stat.candidates": "Candidates",
  "stat.candidatesHint": "Total registered",
  "stat.constituencies": "Constituencies",
  "stat.constituenciesHint": "House of Representatives",
  "stat.promises": "Commitments",
  "stat.promisesHint": "Tracked",
  "stat.opinion": "Public opinion",
  "stat.opinionHint": "Total responses",

  // ---- home features
  "features.title": "What you can do",
  "features.profiles": "Candidate profiles",
  "features.profilesBody":
    "See a representative's record, education, experience and commitments.",
  "features.promises": "Commitment analysis",
  "features.promisesBody": "Analyse the promises made and the progress against them.",
  "features.opinion": "Opinion & surveys",
  "features.opinionBody": "See what people think, and add your own view.",
  "features.calendar": "Election calendar",
  "features.calendarBody": "Follow key dates and the official election schedule.",
  "features.news": "News & updates",
  "features.newsBody": "Get the latest election news and verified updates.",

  // ---- home sections
  "home.latestNews": "Latest news",
  "home.popularCandidates": "Popular candidates",
  "home.recentIssues": "Recent citizen issues",
  "home.upcoming": "Election calendar",
  "home.viewAll": "View all",
  "home.trackPrompt": "Have a tracking ID? Check your issue — no account needed.",
  "home.currentElection": "Current election",
  "home.openElection": "Open election",

  // ---- shared
  "common.viewAll": "View all",
  "common.readMore": "Read more",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.loading": "Loading",
  "common.none": "Not recorded",
  "common.noResults": "Nothing found",
  "common.commitments": "Commitments",
  "common.progress": "progress",
  "common.ratings": "ratings",
  "common.updated": "Updated",
  "common.source": "Source",
  "common.independent": "Independent",
  "common.candidateFor": "House of Representatives candidate",
  "common.views": "views",
  "common.ago": "ago",

  // ---- trust notices
  "notice.notAuthority":
    "NetaTrack is not an election authority. Public-opinion figures are never presented as official election results.",
  "notice.opinionOnly":
    "Ratings are public-opinion indicators, not voting recommendations.",
  "notice.methodology": "View methodology",

  // ---- footer
  "footer.explore": "Explore",
  "footer.participate": "Participate",
  "footer.trust": "Trust",
  "footer.about": "About & neutrality",
  "footer.privacy": "Privacy policy",
  "footer.terms": "Terms of use",
  "footer.methodology": "Rating methodology",
  "footer.researcher": "Researcher access",
  "footer.promises": "Promise tracker",
  "footer.factChecks": "Fact checks",
  "footer.reportIssue": "Report an issue",
  "footer.trackIssue": "Track an issue",
  "footer.pollsRatings": "Polls & ratings",
  "footer.rights": "Independent civic platform.",
  "footer.blurb":
    "Nepal's independent digital platform for election information and citizen accountability.",

  // ---- candidates
  "cand.title": "Candidates",
  "cand.lede":
    "Source-backed profiles. Verification status shows whether the editorial team has confirmed the record against a published source.",
  "cand.compare": "Compare candidates",
  "cand.searchLabel": "Search",
  "cand.searchPlaceholder": "Name, agenda or issue",
  "cand.party": "Party",
  "cand.allParties": "All parties",
  "cand.district": "District",
  "cand.allDistricts": "All districts",
  "cand.verifiedOnly": "Verified only",
  "cand.count": "candidates",
  "cand.noMatch": "No candidates match those filters",
  "cand.noRatings": "No ratings yet",
  "cand.profile": "Profile",
  "cand.biography": "Biography",
  "cand.education": "Education",
  "cand.experience": "Professional experience",
  "cand.positions": "Previous public positions",
  "cand.agenda": "Public agenda",
  "cand.termsServed": "Terms served",
  "cand.prGroup": "Proportional representation group",
  "cand.publicOpinion": "Public opinion",
  "cand.rateThis": "Rate this candidate",
  "cand.updateRating": "Update your rating",
  "cand.sources": "Sources and provenance",
  "cand.commitments": "Manifesto commitments",
  "cand.performance": "Representative performance records",
  "cand.factChecks": "Related fact checks",
  "cand.participation": "Election participation and results",
  "cand.incumbent": "Incumbent",
  "cand.claimed": "Profile claimed",
  "cand.claimPrompt": "Is this your profile?",

  // ---- constituencies
  "con.title": "Constituencies",
  "con.lede":
    "Province, district and constituency records with polling stations, candidates, past results and locally reported citizen issues.",
  "con.searchPlaceholder": "Search constituency or district",
  "con.allProvinces": "All provinces",
  "con.allLevels": "All levels",
  "con.federal": "Federal",
  "con.provincial": "Provincial",
  "con.local": "Local",
  "con.localBodies": "Local bodies",
  "con.type": "Type",
  "con.population": "Population",
  "con.wardsNotPublished": "ward count not published for every local body",
  "con.level": "Level",
  "con.province": "Province",
  "con.registeredVoters": "Registered voters",
  "con.pollingStations": "Polling stations",
  "con.citizenIssues": "Citizen issues",
  "con.currentCandidates": "Current candidates",
  "con.previousResults": "Previous election results",
  "con.previousWinners": "Previous winners",
  "con.localIssues": "Local citizen issues",
  "con.majorIssues": "Major public issues",
  "con.noMatch": "No constituencies match those filters",

  // ---- constituency profile (Phase 3)
  "con.overview": "Constituency overview",
  "con.number": "Constituency number",
  "con.district": "District",
  "con.wards": "Wards",
  "con.area": "Area",
  "con.areaUnit": "km²",
  "con.currentRep": "Current representative",
  "con.noRep": "No sitting representative recorded",
  "con.noRepHint":
    "A representative is shown once a verified result names a winner for this seat, or an incumbent is recorded.",
  "con.electionHistory": "Election history",
  "con.noHistory": "No verified election result for this constituency",
  "con.noHistoryHint":
    "Results appear once the Election Commission record for a contest here has been entered and verified. Nothing is estimated in the meantime.",
  "con.trend": "Election trend",
  "con.trendWinner": "Winning vote share",
  "con.trendTurnout": "Turnout",
  "con.noTrend": "At least two recorded elections are needed to show a trend",
  "con.winMargin": "Winning margin",
  "con.votesCounted": "Votes counted",
  "con.candidatesField": "Candidates",
  "con.candidateList": "Candidates",
  "con.noCandidates": "No candidates recorded for this constituency",
  "con.noCandidatesHint": "Candidate records are attached to a seat once nomination data is entered.",
  "con.news": "Constituency news",
  "con.noNews": "No linked coverage yet",
  "con.noNewsHint":
    "Articles are attached to a constituency by an editor rather than matched from article text.",
  "con.civic": "Public issues and citizen reports",
  "con.noCivic": "No issues reported here yet",
  "con.sources": "Sources and verification",
  "con.noSource": "No source recorded for this constituency record",
  "con.noSourceHint":
    "Boundary, voter and polling-station figures on this page have no citation attached yet. Treat them as unverified.",
  "con.lastUpdated": "Last updated",
  "con.dataRecorded": "Record fields present",
  "con.browse": "Browse by province",
  "con.districts": "Districts",
  "con.seats": "seats",
  "con.federalSeats": "Federal",
  "con.provincialSeats": "Provincial",
  "con.localBodiesShort": "Local",
  "con.partOf": "Part of",
  "con.provincialSegments": "Provincial constituencies",
  "con.pollingStationList": "Polling stations",
  "con.noPollingStations": "No polling station records held",
  "con.pollingCountNote":
    "Count published by the authority. Individual station records may be incomplete.",
  "con.localPromises": "Local commitments",
  "con.errorTitle": "This constituency could not be loaded",
  "con.errorHint":
    "Something went wrong reading the record. The data is unchanged — try again, and if it persists the fault is on our side.",
  "con.unresolvedProvince": "records with an unrecognised province value",
  "con.turnout": "Turnout",
  "con.historicalNote":
    "Winner summaries carried over from the previous system. They record a margin, not a full per-candidate count, so they are kept apart from the verified results above.",

  // ---- results and elections
  "res.title": "Election results",
  "res.lede":
    "Official results only. Public opinion and candidate ratings are stored and displayed separately, and are never presented as election outcomes.",
  "res.totalSeats": "Total seats",
  "res.declared": "Seats declared",
  "res.votesCounted": "Votes counted",
  "res.turnout": "Average turnout",
  "res.byParty": "Seats by party",
  "res.declaredResults": "Declared results",
  "res.candidate": "Candidate",
  "res.votes": "Votes",
  "res.voteShare": "Vote share",
  "res.elected": "Elected",
  "res.noneYet": "No verified results published for this election yet",
  "elec.title": "Elections",
  "elec.pollingDay": "Polling day",
  "elec.calendar": "Election calendar",
  "elec.upcoming": "Upcoming",
  "elec.past": "Past events",

  // ---- issues
  "issue.reportTitle": "Report a citizen issue",
  "issue.reportLede":
    "Every submitted issue receives a public tracking ID and a transparent status timeline. You can follow it without an account.",
  "issue.trackTitle": "Track an issue",
  "issue.trackLede":
    "Enter the tracking ID you received when the issue was submitted. No account is required.",
  "issue.whatNext": "What happens next",
  "issue.timeline": "Progress timeline",
  "issue.officialResponse": "Official response",
  "issue.statusDetail": "Status detail",
  "issue.yourFeedback": "Your feedback",
  "issue.myIssues": "Your recent issues",
  "issue.notFound": "No issue found with that tracking ID",
  "issue.privacyNote":
    "Your name, email and account details never appear on the public tracking page. Only the issue summary, status timeline and official responses are public.",

  // ---- opinion, promises, news
  "op.title": "Public opinion",
  "op.lede":
    "Polls, surveys and candidate ratings submitted by registered users. These figures measure perception. They are not election results and are not voting recommendations.",
  "op.leaderboard": "Candidate rating leaderboard",
  "op.howCalculated": "How ratings are calculated",
  "op.safeguards": "Rating safeguards",
  "prom.title": "Manifesto and promise tracker",
  "prom.lede":
    "Campaign commitments converted into trackable records. Every status change is recorded, and a promise cannot be marked completed without an evidence link.",
  "prom.tracked": "Promises tracked",
  "prom.completed": "Completed",
  "prom.delayed": "Delayed",
  "prom.completionRate": "Completion rate",
  "prom.representative": "Representative",
  "prom.evidence": "Evidence",
  "prom.lastUpdate": "Last update",
  "news.title": "News and updates",
  "news.lede":
    "Editorial content follows a draft, review, source review, approval and publish workflow. Corrections are preserved in a visible revision history.",
  "news.all": "All",
  "news.corrected": "Corrected",
  "news.factChecked": "Fact checked",
  "fc.title": "Fact checks",
  "fc.lede":
    "Claim intake, evidence collection, reviewer, verdict, editor approval and publication. Subjects may attach a response; a response never overwrites the verdict.",

  // ---- admin shell
  "adm.dashboard": "Dashboard",
  "adm.overview": "Overview",
  "adm.analytics": "Analytics",
  "adm.issuesGroup": "Citizen issues",
  "adm.issueQueue": "Issue queue",
  "adm.electionGroup": "Election data",
  "adm.candidates": "Candidates",
  "adm.claims": "Profile claims",
  "adm.elections": "Elections",
  "adm.results": "Results",
  "adm.contentGroup": "Content",
  "adm.news": "News",
  "adm.factChecks": "Fact checks",
  "adm.promises": "Promises",
  "adm.polls": "Polls",
  "adm.ratings": "Rating moderation",
  "adm.adminGroup": "Administration",
  "adm.users": "Users",
  "adm.roles": "Roles & permissions",
  "adm.notifications": "Email & notifications",
  "adm.audit": "Audit log",
  "adm.settings": "System settings",

  // ---- admin dashboard
  "adm.openIssues": "Open issues",
  "adm.overdue": "Overdue",
  "adm.unassigned": "Unassigned",
  "adm.resolved24": "Resolved (24h)",
  "adm.pendingClaims": "Pending profile claims",
  "adm.awaitingVerification": "Candidates awaiting verification",
  "adm.contentInReview": "Content in review",
  "adm.flaggedRatings": "Flagged ratings",
  "adm.recentActivity": "Recent privileged activity",
  "adm.pendingReview": "Pending review",
  "adm.allQueues": "All queues",
  "adm.yourQueue": "Your assigned queue",
  "adm.signedInAs": "signed in as",
  "adm.nothingInQueue": "Nothing in your queue",

  // ---- admin tables and controls
  "adm.trackingId": "Tracking ID",
  "adm.issue": "Issue",
  "adm.category": "Category",
  "adm.priority": "Priority",
  "adm.status": "Status",
  "adm.assignee": "Assignee",
  "adm.due": "Due",
  "adm.actor": "Actor",
  "adm.action": "Action",
  "adm.target": "Target",
  "adm.result": "Result",
  "adm.when": "When",
  "adm.changeSummary": "Change summary",
  "adm.role": "Role",
  "adm.reason": "Reason",
  "adm.save": "Save",
  "adm.apply": "Apply",
  "adm.allStatuses": "All statuses",
  "adm.allRoles": "All roles",
  "adm.allActions": "All actions",
  "adm.mine": "Mine",
  "adm.reopenRequested": "Reopen requested",
  "adm.noMatch": "Nothing matches those filters",
  "adm.takeAction": "Take action",
  "adm.description": "Description",
  "adm.fullTimeline": "Full timeline (internal)",
  "adm.caseDetail": "Case detail",
  "adm.internalNote": "Latest internal note",
  "adm.citizenFeedback": "Citizen feedback",
  "adm.evidence": "Evidence",
  "adm.viewPublicPage": "View public page",
  "adm.public": "Public",
  "adm.internal": "Internal",
  "adm.reporter": "Reporter",
  "adm.anonymous": "Anonymous",
  "adm.department": "Department",
  "adm.verifiedBy": "Verified by",
  "adm.nextUpdate": "Next update due",
  "adm.lastUpdated": "Last updated",
  "adm.moveTo": "Move to status",
  "adm.assignTo": "Assign to",
  "adm.publicUpdate": "Public update",
  "adm.resolutionNote": "Resolution note",
  "adm.unchanged": "Unchanged",
  "adm.accountStatus": "Account status",
  "adm.totalAccounts": "Total accounts",
  "adm.staffAndAdmins": "Staff and admins",
  "adm.researchers": "Researchers",
  "adm.verified": "Verified",
  "adm.pending": "Pending",
  "adm.rejected": "Rejected",
  "adm.published": "Published",
  "adm.drafts": "Drafts",
  "adm.inPipeline": "In pipeline",
  "adm.total": "Total",
  "adm.awaitingReview": "Awaiting review",
  "adm.approved": "Approved",
  "adm.recentDecisions": "Recent decisions",
  "adm.configuration": "Configuration",
  "adm.environment": "Environment",
  "adm.deliveryLog": "Delivery log",
  "adm.testSend": "Test send",
  "adm.messageTypes": "Message types in use",
  "adm.queued": "Queued",
  "adm.sent": "Sent",
  "adm.failed": "Failed",
  "adm.recipient": "Recipient",
  "adm.subject": "Subject",
  "adm.created": "Created",
  "adm.needsAttention": "Needs attention",
  "adm.openReports": "Open reports",
  "adm.visible": "Visible",
  "adm.nothingToModerate": "Nothing needs moderation",
  "adm.internalOnlyNote":
    "Only the public update field and the status appear on the citizen tracking page. Internal notes never leave this screen.",

  // ---- dashboard homepage
  "dash.eyebrow": "Nepal Political Intelligence Platform",
  "dash.headline": "What's happening in Nepalese politics today?",
  "dash.sub": "Live intelligence on leaders, constituencies, commitments and public opinion — sourced, tracked and open to every citizen.",
  "dash.explore": "Explore leaders",
  "dash.trackIssue": "Track an issue",
  "dash.liveNow": "Live",
  "kpi.leaders": "Leaders",
  "kpi.constituencies": "Constituencies",
  "kpi.commitments": "Commitments",
  "kpi.opinions": "Public opinions",
  "kpi.leadersHint": "profiles tracked",
  "kpi.constituenciesHint": "federal seats",
  "kpi.commitmentsHint": "promises tracked",
  "kpi.opinionsHint": "ratings and votes",

  "sec.trending": "Trending leaders",
  "sec.trendingSub": "Ranked by measurable activity — ratings, fact checks and tracked commitments.",
  "sec.pulse": "Constituency pulse",
  "sec.pulseSub": "Explore all seven provinces. Select a province to see its seats, candidates and open issues.",
  "sec.opinion": "Public opinion",
  "sec.opinionSub": "How citizens rate their representatives, across six published dimensions.",
  "sec.commitments": "Commitment tracker",
  "sec.commitmentsSub": "Every promise, its status and the evidence behind it.",
  "sec.radar": "Political radar",
  "sec.radarSub": "Everything that moved recently, in one stream.",
  "sec.countdown": "Next election milestone",

  "basis.rated": "Publicly rated",
  "basis.factchecked": "Fact checked",
  "basis.office": "Holds office",
  "basis.incumbent": "Incumbent",

  "pulse.seats": "seats",
  "pulse.candidates": "Candidates",
  "pulse.issues": "Open issues",
  "pulse.voters": "Registered voters",
  "pulse.explore": "Explore this province",
  "pulse.districts": "Largest districts",
  "pulse.federal": "federal",
  "pulse.provincial": "provincial",
  "pulse.pick": "Choose a province",

  "sent.positive": "Positive",
  "sent.neutral": "Neutral",
  "sent.negative": "Negative",
  "op.avgRating": "Average rating",
  "op.dimensions": "By dimension",
  "op.noData": "No ratings submitted yet",
  "op.noDataHint": "Once citizens rate candidates, sentiment and dimension scores appear here.",
  "op.beFirst": "Rate a candidate",

  "cm.completionRate": "Completion rate",
  "cm.withEvidence": "backed by evidence",
  "cm.recent": "Recently updated",
  "cm.noData": "No commitments recorded yet",
  "cm.noDataHint": "Promises appear here once the editorial team records them from published manifestos.",
  "cm.browse": "Open the tracker",

  "radar.noData": "Nothing recorded yet",
  "radar.news": "News",
  "radar.factcheck": "Fact check",
  "radar.issue": "Citizen issue",
  "radar.result": "Past result",
  "radar.promise": "Commitment",

  "cd.days": "days",
  "cd.hours": "hrs",
  "cd.minutes": "min",
  "cd.seconds": "sec",
  "cd.passed": "This milestone has passed",

  // ---- trust layer
  "trust.verified": "Verified",
  "trust.unverified": "Unverified",
  "trust.historical": "Historical",
  "trust.official": "Official data",
  "trust.source": "Source",
  "trust.checked": "checked",
  "trust.lastUpdated": "Last updated",
  "trust.pendingReview": "Candidate records pending verification",
  "trust.corroborated": "candidate records corroborated",
  "trust.corroboratedNote":
    "Name, constituency and party checked against a published member list for the 2026 general election. Secondary source — not yet confirmed against the Election Commission's own record.",
  "trust.noVerifiedElection": "No verified current election on record",
  "trust.latestElection": "Most recent verified election",
  "trust.pollingDay": "Polling day",
  "trust.seats": "seats",
  "trust.fptp": "first-past-the-post",
  "trust.pr": "proportional",
  "trust.resultsAt": "Full results at the Election Commission",
  "trust.countingDone": "Counting concluded",
  "trust.noResultsHeld":
    "Seat totals are not shown here: they were reported by a single source and this platform records a figure as fact only after cross-checking.",
  "trust.historicalNote":
    "Historical record. Kept for traceability and clearly separated from current data.",
  "trust.unverifiedNote":
    "This record could not be confirmed against an authoritative source and is not treated as current.",

  // ---- verification tiers (VerificationTier)
  "tier.OFFICIAL": "Officially Verified",
  "tier.NETATRACK": "NetaTrack Verified",
  "tier.UNVERIFIED": "Unverified",
  "tier.DISPUTED": "Disputed",
  "tier.OFFICIAL.note":
    "Confirmed against the issuing authority's own published record.",
  "tier.NETATRACK.note":
    "Cross-checked by NetaTrack against a published secondary source. Not yet confirmed against the authority's own record.",
  "tier.UNVERIFIED.note":
    "Not yet confirmed against any published source. Shown for transparency, not as fact.",
  "tier.DISPUTED.note":
    "Published sources disagree on this record. Treat with caution until resolved.",
  "tier.sources": "Sources",
  "tier.noSource": "No source recorded",
  "tier.dataAsOf": "Data as of",

  // ---- candidate profile (Phase 2)
  "cand.notRecorded": "Not recorded yet",
  "cand.notRecordedHint":
    "No sourced record has been added for this section. NetaTrack shows a gap rather than an estimate.",
  "cand.notRecordedShort": "Not recorded",
  "cand.lastUpdated": "Last updated",
  "cand.disclaimer":
    "NetaTrack provides factual information for public awareness and comparison. It does not endorse or recommend any political party or candidate.",
  "cand.dataCompleteness": "Profile data recorded",
  "cand.completenessHint": "sections with at least one sourced record",
  "cand.currentPosition": "Current position",
  "cand.politicalExperience": "Political experience",
  "cand.province": "Province",
  "cand.constituency": "Constituency",
  "cand.prMember": "Proportional representation member",
  "cand.noSeatHint": "Elected from the proportional representation list, so no single constituency applies.",
  "cand.educationUnverified":
    "An education record exists but no source cites it, so it is withheld. NetaTrack publishes this field only when a source backs it.",

  // election history
  "cand.electionHistory": "Election history",
  "cand.historyEmpty": "No election record for this politician yet",
  "cand.historyEmptyHint":
    "Candidacies and official results appear here once the Election Commission record for the contest has been entered and verified.",
  "cand.elected": "Elected",
  "cand.notElected": "Not elected",
  "cand.resultPending": "No published result",
  "cand.bs": "BS",
  "cand.votes": "Votes",
  "cand.voteShare": "Vote share",
  "cand.rank": "Rank",
  "cand.marginWon": "Won by",
  "cand.marginBehind": "Behind winner by",

  // performance
  "cand.politicalPerformance": "Political performance",
  "cand.performanceEmpty": "No performance record published",
  "cand.performanceEmptyHint":
    "Attendance, questions, bills and committee activity appear here when a reliable published record exists. NetaTrack does not estimate these figures.",
  "cand.performanceNote":
    "Objective, source-backed activity records. Kept separate from perception-based ratings.",
  "cand.mAttendance": "Attendance",
  "cand.mQuestions": "Questions raised",
  "cand.mBills": "Bills and proposals",
  "cand.mCommittee": "Committee meetings",
  "cand.mLocal": "Constituency activities",
  "cand.mResponses": "Issue responses",

  // commitments
  "cand.pTotal": "Total commitments",
  "cand.pCompleted": "Completed",
  "cand.pInProgress": "In progress",
  "cand.pDelayed": "Delayed",
  "cand.pNotStarted": "Not started",
  "cand.pCancelled": "Cancelled",
  "cand.pUnknown": "Unverified",
  "cand.pCompletedShare": "completed",
  "cand.promisesEmpty": "No commitments recorded",
  "cand.promisesEmptyHint":
    "Manifesto commitments are added with a source and tracked over time. None have been recorded for this politician.",

  // news
  "cand.news": "Latest updates",
  "cand.newsEmpty": "No linked coverage yet",
  "cand.newsEmptyHint":
    "Articles are attached to a politician by an editor. NetaTrack does not match names in article text, which would attribute stories wrongly.",

  // states
  "cand.errorTitle": "This profile could not be loaded",
  "cand.errorHint":
    "Something went wrong reading the record. The data is unchanged — try again, and if it persists the fault is on our side.",
  "cand.retry": "Try again",
  "cand.loading": "Loading",
  "cand.independent": "Independent",
  "cand.ratings": "ratings",
  "cand.noRatingsYet": "No ratings yet. Be the first to rate this politician.",
  "cand.distribution": "Distribution",
  "cand.opinionNote": "User-generated public opinion. Not an official election result.",
  "cand.rateLogin": "to rate. Only authenticated users can submit ratings, and each account may rate a politician once.",
  "cand.rateOwn": "You cannot rate your own profile.",
  "cand.contestsRecorded": "contests recorded",
  "cand.termsHint": "terms in office",
  "cand.sourcesCount": "Sources",
  "cand.sourcesHint": "citations on this profile",
  "cand.promise": "Commitment",
  "cand.status": "Status",
  "cand.evidence": "Evidence",
  "cand.documents": "Candidate-submitted documents",
  "cand.noSourceRecords": "No sources attached",
  "cand.noSourceHint": "Nothing on this profile has a citation yet. Treat every field as unverified until one is added.",
  "cand.factCheckNote": "Fact checks are independent editorial records. A politician may attach a response but cannot change a verdict.",
  "cand.claimBody": "Politicians can claim a profile and edit permitted fields after identity review. Editorial records, verification decisions and fact-checks stay independent.",
  "cand.claimCta": "Claim this profile",
  "nav.methodology": "Methodology",
} as const;

export type TranslationKey = keyof typeof en;

const ne: Partial<Record<TranslationKey, string>> = {
  "brand.tagline": "सूचना · विश्लेषण · पारदर्शिता",
  "brand.statement": "जान्नुहोस्। मत दिनुहोस्। ट्र्याक गर्नुहोस्।",
  "nav.home": "गृहपृष्ठ",
  "nav.candidates": "उम्मेदवार",
  "nav.constituencies": "निर्वाचन क्षेत्र",
  "nav.elections": "निर्वाचन",
  "nav.news": "समाचार",
  "nav.opinion": "जनमत",
  "nav.calendar": "क्यालेन्डर",
  "nav.results": "परिणाम",
  "nav.track": "उजुरी ट्र्याक",
  "nav.analytics": "विश्लेषण",
  "nav.about": "हाम्रोबारे",
  "nav.login": "लगइन",
  "nav.register": "दर्ता गर्नुहोस्",
  "nav.logout": "लगआउट",
  "nav.admin": "प्रशासन",
  "nav.account": "खाता",
  "nav.report": "उजुरी दर्ता",
  "nav.search": "खोज्नुहोस्",
  "nav.searchPlaceholder": "खोज्नुहोस्…",
  "nav.toggleTheme": "उज्यालो/अँध्यारो थिम",
  "nav.toggleMenu": "मेनु",
  "nav.language": "भाषा",
  "nav.notifications": "सूचनाहरू",
  "nav.skipToContent": "मुख्य सामग्रीमा जानुहोस्",

  "home.welcome": "स्वागत छ NetaTrack मा",
  "home.headline": "नेता, नीति र जनताको सम्पर्कको डिजिटल प्लेटफर्म",
  "home.headlineAccent": "डिजिटल प्लेटफर्म",
  "home.subhead":
    "नेतालाई ट्र्याक गर्नुहोस्, प्रतिबद्धता विश्लेषण गर्नुहोस् र सचेत नागरिक बनौं।",
  "home.ctaCandidates": "उम्मेदवार खोज्नुहोस्",
  "home.ctaConstituencies": "निर्वाचन क्षेत्र हेर्नुहोस्",

  "stat.candidates": "उम्मेदवारहरू",
  "stat.candidatesHint": "कुल दर्ता",
  "stat.constituencies": "निर्वाचन क्षेत्र",
  "stat.constituenciesHint": "प्रतिनिधिसभा",
  "stat.promises": "प्रतिबद्धता",
  "stat.promisesHint": "ट्र्याक गरिएको",
  "stat.opinion": "जनमत",
  "stat.opinionHint": "कुल मत",

  "features.title": "हाम्रा सुविधाहरू",
  "features.profiles": "उम्मेदवार प्रोफाइल",
  "features.profilesBody": "नेताको चुनावी विवरण, शिक्षा, अनुभव र प्रतिबद्धता हेर्नुहोस्।",
  "features.promises": "प्रतिबद्धता विश्लेषण",
  "features.promisesBody": "नेताले गरेका प्रतिबद्धता र प्रगतिको विश्लेषण गर्नुहोस्।",
  "features.opinion": "जनमत / सर्वेक्षण",
  "features.opinionBody": "जनताको विचार जान्न र आफ्नो मत दिनुहोस्।",
  "features.calendar": "निर्वाचन क्यालेन्डर",
  "features.calendarBody": "महत्वपूर्ण मिति र निर्वाचन कार्यतालिका हेर्नुहोस्।",
  "features.news": "समाचार र अपडेट",
  "features.newsBody": "निर्वाचन सम्बन्धी ताजा समाचार र अपडेट पाउनुहोस्।",

  "home.latestNews": "ताजा समाचार",
  "home.popularCandidates": "लोकप्रिय उम्मेदवार",
  "home.recentIssues": "हालका नागरिक उजुरी",
  "home.upcoming": "निर्वाचन क्यालेन्डर",
  "home.viewAll": "सबै हेर्नुहोस्",
  "home.trackPrompt": "ट्र्याकिङ आईडी छ? खाता बिना नै उजुरी हेर्नुहोस्।",
  "home.currentElection": "हालको निर्वाचन",
  "home.openElection": "निर्वाचन हेर्नुहोस्",

  "common.viewAll": "सबै हेर्नुहोस्",
  "common.readMore": "थप पढ्नुहोस्",
  "common.search": "खोज्नुहोस्",
  "common.filter": "छान्नुहोस्",
  "common.loading": "लोड हुँदैछ",
  "common.none": "उल्लेख छैन",
  "common.noResults": "केही फेला परेन",
  "common.commitments": "प्रतिबद्धता",
  "common.progress": "प्रगति",
  "common.ratings": "मूल्याङ्कन",
  "common.updated": "अद्यावधिक",
  "common.source": "स्रोत",
  "common.independent": "स्वतन्त्र",
  "common.candidateFor": "प्रतिनिधि सभा उम्मेदवार",
  "common.views": "पढिएको",
  "common.ago": "अघि",

  "notice.notAuthority":
    "NetaTrack निर्वाचन आयोग होइन। जनमतका तथ्याङ्कलाई आधिकारिक निर्वाचन परिणामका रूपमा प्रस्तुत गरिँदैन।",
  "notice.opinionOnly": "मूल्याङ्कन जनमतको सूचक हो, मतदान सिफारिस होइन।",
  "notice.methodology": "विधि हेर्नुहोस्",

  "footer.explore": "अन्वेषण",
  "footer.participate": "सहभागिता",
  "footer.trust": "विश्वसनीयता",
  "footer.about": "हाम्रोबारे र तटस्थता",
  "footer.privacy": "गोपनीयता नीति",
  "footer.terms": "प्रयोगका सर्तहरू",
  "footer.methodology": "मूल्याङ्कन विधि",
  "footer.researcher": "अनुसन्धानकर्ता पहुँच",
  "footer.promises": "प्रतिबद्धता ट्र्याकर",
  "footer.factChecks": "तथ्य जाँच",
  "footer.reportIssue": "उजुरी दर्ता गर्नुहोस्",
  "footer.trackIssue": "उजुरी ट्र्याक गर्नुहोस्",
  "footer.pollsRatings": "जनमत र मूल्याङ्कन",
  "footer.rights": "स्वतन्त्र नागरिक प्लेटफर्म।",
  "footer.blurb":
    "निर्वाचन सूचना र नागरिक उत्तरदायित्वका लागि नेपालको स्वतन्त्र डिजिटल प्लेटफर्म।",

  "cand.title": "उम्मेदवारहरू",
  "cand.lede":
    "स्रोतसहितका प्रोफाइल। प्रमाणीकरण स्थितिले सम्पादकीय टोलीले प्रकाशित स्रोतसँग रेकर्ड भिडाएको हो कि होइन देखाउँछ।",
  "cand.compare": "उम्मेदवार तुलना",
  "cand.searchLabel": "खोज",
  "cand.searchPlaceholder": "नाम, एजेन्डा वा मुद्दा",
  "cand.party": "दल",
  "cand.allParties": "सबै दल",
  "cand.district": "जिल्ला",
  "cand.allDistricts": "सबै जिल्ला",
  "cand.verifiedOnly": "प्रमाणित मात्र",
  "cand.count": "उम्मेदवार",
  "cand.noMatch": "यी फिल्टरसँग मिल्ने उम्मेदवार भेटिएन",
  "cand.noRatings": "अहिलेसम्म मूल्याङ्कन छैन",
  "cand.profile": "प्रोफाइल",
  "cand.biography": "परिचय",
  "cand.education": "शिक्षा",
  "cand.experience": "पेसागत अनुभव",
  "cand.positions": "विगतका सार्वजनिक पद",
  "cand.agenda": "सार्वजनिक एजेन्डा",
  "cand.termsServed": "कार्यकाल",
  "cand.prGroup": "समानुपातिक समूह",
  "cand.publicOpinion": "जनमत",
  "cand.rateThis": "मूल्याङ्कन गर्नुहोस्",
  "cand.updateRating": "मूल्याङ्कन अद्यावधिक गर्नुहोस्",
  "cand.sources": "स्रोत र प्रमाण",
  "cand.commitments": "घोषणापत्रका प्रतिबद्धता",
  "cand.performance": "प्रतिनिधिको कार्यसम्पादन रेकर्ड",
  "cand.factChecks": "सम्बन्धित तथ्य जाँच",
  "cand.participation": "निर्वाचन सहभागिता र परिणाम",
  "cand.incumbent": "बहालवाला",
  "cand.claimed": "प्रोफाइल दाबी गरिएको",
  "cand.claimPrompt": "के यो तपाईंको प्रोफाइल हो?",

  "con.title": "निर्वाचन क्षेत्र",
  "con.lede":
    "प्रदेश, जिल्ला र निर्वाचन क्षेत्रका विवरण — मतदान केन्द्र, उम्मेदवार, विगतका परिणाम र स्थानीय नागरिक उजुरीसहित।",
  "con.searchPlaceholder": "क्षेत्र वा जिल्ला खोज्नुहोस्",
  "con.allProvinces": "सबै प्रदेश",
  "con.allLevels": "सबै तह",
  "con.federal": "संघीय",
  "con.provincial": "प्रादेशिक",
  "con.local": "स्थानीय",
  "con.localBodies": "स्थानीय तह",
  "con.type": "प्रकार",
  "con.population": "जनसङ्ख्या",
  "con.wardsNotPublished": "सबै स्थानीय तहको वडा सङ्ख्या प्रकाशित छैन",
  "con.level": "तह",
  "con.province": "प्रदेश",
  "con.registeredVoters": "दर्ता मतदाता",
  "con.pollingStations": "मतदान केन्द्र",
  "con.citizenIssues": "नागरिक उजुरी",
  "con.currentCandidates": "हालका उम्मेदवार",
  "con.previousResults": "विगतका निर्वाचन परिणाम",
  "con.previousWinners": "विगतका विजेता",
  "con.localIssues": "स्थानीय नागरिक उजुरी",
  "con.majorIssues": "प्रमुख सार्वजनिक मुद्दा",
  "con.noMatch": "यी फिल्टरसँग मिल्ने क्षेत्र भेटिएन",

  // ---- निर्वाचन क्षेत्र प्रोफाइल
  "con.overview": "निर्वाचन क्षेत्र सिंहावलोकन",
  "con.number": "क्षेत्र नम्बर",
  "con.district": "जिल्ला",
  "con.wards": "वडा",
  "con.area": "क्षेत्रफल",
  "con.areaUnit": "वर्ग कि.मि.",
  "con.currentRep": "हालका जनप्रतिनिधि",
  "con.noRep": "हालको जनप्रतिनिधि अभिलेख छैन",
  "con.noRepHint":
    "प्रमाणित परिणामले विजेता तोकेपछि वा बहालवाला अभिलेख भएपछि जनप्रतिनिधि देखाइन्छ।",
  "con.electionHistory": "निर्वाचन इतिहास",
  "con.noHistory": "यस क्षेत्रको प्रमाणित निर्वाचन परिणाम छैन",
  "con.noHistoryHint":
    "निर्वाचन आयोगको अभिलेख प्रविष्ट र प्रमाणित भएपछि परिणाम देखिनेछ। त्यससम्म केही पनि अनुमान गरिँदैन।",
  "con.trend": "निर्वाचन प्रवृत्ति",
  "con.trendWinner": "विजेताको मत हिस्सा",
  "con.trendTurnout": "मतदान दर",
  "con.noTrend": "प्रवृत्ति देखाउन कम्तीमा दुई निर्वाचनको अभिलेख चाहिन्छ",
  "con.winMargin": "विजयी अन्तर",
  "con.votesCounted": "गणना भएको मत",
  "con.candidatesField": "उम्मेदवार",
  "con.candidateList": "उम्मेदवारहरू",
  "con.noCandidates": "यस क्षेत्रमा कुनै उम्मेदवार अभिलेख छैन",
  "con.noCandidatesHint": "मनोनयन विवरण प्रविष्ट भएपछि उम्मेदवार अभिलेख क्षेत्रसँग जोडिन्छ।",
  "con.news": "क्षेत्रसम्बन्धी समाचार",
  "con.noNews": "सम्बन्धित समाचार जोडिएको छैन",
  "con.noNewsHint":
    "समाचारलाई सम्पादकले क्षेत्रसँग जोड्छन्; पाठबाट स्वतः मिलाइँदैन।",
  "con.civic": "सार्वजनिक मुद्दा र नागरिक उजुरी",
  "con.noCivic": "यहाँ अहिलेसम्म कुनै उजुरी छैन",
  "con.sources": "स्रोत र प्रमाणीकरण",
  "con.noSource": "यस क्षेत्रको अभिलेखमा स्रोत छैन",
  "con.noSourceHint":
    "यस पृष्ठका सिमाना, मतदाता र मतदान केन्द्रका तथ्याङ्कमा उद्धरण जोडिएको छैन। अप्रमाणित मान्नुहोस्।",
  "con.lastUpdated": "पछिल्लो अद्यावधिक",
  "con.dataRecorded": "अभिलेख भएका विवरण",
  "con.browse": "प्रदेश अनुसार हेर्नुहोस्",
  "con.districts": "जिल्ला",
  "con.seats": "क्षेत्र",
  "con.federalSeats": "संघीय",
  "con.provincialSeats": "प्रदेश",
  "con.localBodiesShort": "स्थानीय",
  "con.partOf": "अन्तर्गत",
  "con.provincialSegments": "प्रदेश निर्वाचन क्षेत्र",
  "con.pollingStationList": "मतदान केन्द्र",
  "con.noPollingStations": "मतदान केन्द्रको अभिलेख छैन",
  "con.pollingCountNote":
    "निकायले प्रकाशित गरेको सङ्ख्या। छुट्टाछुट्टै केन्द्रको अभिलेख अपूर्ण हुन सक्छ।",
  "con.localPromises": "स्थानीय प्रतिबद्धता",
  "con.errorTitle": "यो निर्वाचन क्षेत्र लोड गर्न सकिएन",
  "con.errorHint":
    "अभिलेख पढ्ने क्रममा त्रुटि भयो। तथ्याङ्क यथावत् छ — पुनः प्रयास गर्नुहोस्; दोहोरिए यो हाम्रो पक्षको समस्या हो।",
  "con.unresolvedProvince": "अपरिचित प्रदेश मान भएका अभिलेख",
  "con.turnout": "मतदान दर",
  "con.historicalNote":
    "अघिल्लो प्रणालीबाट सारिएका विजेता सारांश। यसमा अन्तर मात्र छ, प्रत्येक उम्मेदवारको पूर्ण मत गणना छैन, त्यसैले माथिका प्रमाणित परिणामभन्दा छुट्टै राखिएको छ।",

  "res.title": "निर्वाचन परिणाम",
  "res.lede":
    "आधिकारिक परिणाम मात्र। जनमत र उम्मेदवार मूल्याङ्कन छुट्टै राखिन्छ र कहिल्यै निर्वाचन परिणामका रूपमा देखाइँदैन।",
  "res.totalSeats": "कुल सिट",
  "res.declared": "घोषित सिट",
  "res.votesCounted": "गनिएका मत",
  "res.turnout": "औसत मतदान",
  "res.byParty": "दलगत सिट",
  "res.declaredResults": "घोषित परिणाम",
  "res.candidate": "उम्मेदवार",
  "res.votes": "मत",
  "res.voteShare": "मत हिस्सा",
  "res.elected": "निर्वाचित",
  "res.noneYet": "यस निर्वाचनको प्रमाणित परिणाम अझै प्रकाशित भएको छैन",
  "elec.title": "निर्वाचन",
  "elec.pollingDay": "मतदान दिन",
  "elec.calendar": "निर्वाचन क्यालेन्डर",
  "elec.upcoming": "आगामी",
  "elec.past": "विगतका कार्यक्रम",

  "issue.reportTitle": "नागरिक उजुरी दर्ता",
  "issue.reportLede":
    "दर्ता भएको प्रत्येक उजुरीले सार्वजनिक ट्र्याकिङ आईडी र पारदर्शी स्थिति समयरेखा पाउँछ। खाता बिना नै पछ्याउन सकिन्छ।",
  "issue.trackTitle": "उजुरी ट्र्याक",
  "issue.trackLede":
    "उजुरी दर्ता गर्दा पाएको ट्र्याकिङ आईडी हाल्नुहोस्। खाता आवश्यक पर्दैन।",
  "issue.whatNext": "अब के हुन्छ",
  "issue.timeline": "प्रगति समयरेखा",
  "issue.officialResponse": "आधिकारिक जवाफ",
  "issue.statusDetail": "स्थिति विवरण",
  "issue.yourFeedback": "तपाईंको प्रतिक्रिया",
  "issue.myIssues": "तपाईंका हालका उजुरी",
  "issue.notFound": "यो ट्र्याकिङ आईडीसँग मिल्ने उजुरी भेटिएन",
  "issue.privacyNote":
    "तपाईंको नाम, इमेल र खाताको विवरण सार्वजनिक ट्र्याकिङ पृष्ठमा देखिँदैन। उजुरीको सारांश, स्थिति र आधिकारिक जवाफ मात्र सार्वजनिक हुन्छ।",

  "op.title": "जनमत",
  "op.lede":
    "दर्ता प्रयोगकर्ताले दिएका मतदान, सर्वेक्षण र उम्मेदवार मूल्याङ्कन। यी तथ्याङ्कले धारणा मापन गर्छन् — निर्वाचन परिणाम वा मतदान सिफारिस होइनन्।",
  "op.leaderboard": "उम्मेदवार मूल्याङ्कन सूची",
  "op.howCalculated": "मूल्याङ्कन कसरी गणना हुन्छ",
  "op.safeguards": "मूल्याङ्कन सुरक्षा उपाय",
  "prom.title": "घोषणापत्र र प्रतिबद्धता ट्र्याकर",
  "prom.lede":
    "चुनावी प्रतिबद्धतालाई ट्र्याक गर्न मिल्ने रेकर्डमा परिणत गरिएको। हरेक स्थिति परिवर्तन अभिलेख हुन्छ, र प्रमाण बिना प्रतिबद्धता पूरा भएको मानिँदैन।",
  "prom.tracked": "ट्र्याक गरिएका प्रतिबद्धता",
  "prom.completed": "पूरा भएको",
  "prom.delayed": "ढिलाइ",
  "prom.completionRate": "पूर्णता दर",
  "prom.representative": "प्रतिनिधि",
  "prom.evidence": "प्रमाण",
  "prom.lastUpdate": "पछिल्लो अद्यावधिक",
  "news.title": "समाचार र अपडेट",
  "news.lede":
    "सम्पादकीय सामग्री मस्यौदा, समीक्षा, स्रोत जाँच, स्वीकृति र प्रकाशनको प्रक्रियाबाट जान्छ। सुधारहरू देखिने संशोधन इतिहासमा सुरक्षित रहन्छन्।",
  "news.all": "सबै",
  "news.corrected": "सुधारिएको",
  "news.factChecked": "तथ्य जाँच भएको",
  "fc.title": "तथ्य जाँच",
  "fc.lede":
    "दाबी संकलन, प्रमाण जुटाउने, समीक्षक, निर्णय, सम्पादक स्वीकृति र प्रकाशन। सम्बन्धित पक्षले जवाफ राख्न सक्छन्; जवाफले निर्णय बदल्दैन।",

  "adm.dashboard": "ड्यासबोर्ड",
  "adm.overview": "सिंहावलोकन",
  "adm.analytics": "विश्लेषण",
  "adm.issuesGroup": "नागरिक उजुरी",
  "adm.issueQueue": "उजुरी सूची",
  "adm.electionGroup": "निर्वाचन तथ्याङ्क",
  "adm.candidates": "उम्मेदवार",
  "adm.claims": "प्रोफाइल दाबी",
  "adm.elections": "निर्वाचन",
  "adm.results": "परिणाम",
  "adm.contentGroup": "सामग्री",
  "adm.news": "समाचार",
  "adm.factChecks": "तथ्य जाँच",
  "adm.promises": "प्रतिबद्धता",
  "adm.polls": "जनमत सर्वेक्षण",
  "adm.ratings": "मूल्याङ्कन नियमन",
  "adm.adminGroup": "प्रशासन",
  "adm.users": "प्रयोगकर्ता",
  "adm.roles": "भूमिका र अनुमति",
  "adm.notifications": "इमेल र सूचना",
  "adm.audit": "अडिट लग",
  "adm.settings": "प्रणाली सेटिङ",

  "adm.openIssues": "खुला उजुरी",
  "adm.overdue": "म्याद नाघेको",
  "adm.unassigned": "जिम्मा नतोकिएको",
  "adm.resolved24": "समाधान (२४ घण्टा)",
  "adm.pendingClaims": "विचाराधीन प्रोफाइल दाबी",
  "adm.awaitingVerification": "प्रमाणीकरण पर्खिरहेका उम्मेदवार",
  "adm.contentInReview": "समीक्षामा रहेको सामग्री",
  "adm.flaggedRatings": "चिन्ह लगाइएका मूल्याङ्कन",
  "adm.recentActivity": "हालका विशेषाधिकार गतिविधि",
  "adm.pendingReview": "समीक्षा बाँकी",
  "adm.allQueues": "सबै सूची",
  "adm.yourQueue": "तपाईंलाई तोकिएको सूची",
  "adm.signedInAs": "लगइन",
  "adm.nothingInQueue": "तपाईंको सूचीमा केही छैन",

  "adm.trackingId": "ट्र्याकिङ आईडी",
  "adm.issue": "उजुरी",
  "adm.category": "वर्ग",
  "adm.priority": "प्राथमिकता",
  "adm.status": "स्थिति",
  "adm.assignee": "जिम्मेवार",
  "adm.due": "म्याद",
  "adm.actor": "कर्ता",
  "adm.action": "कार्य",
  "adm.target": "लक्ष्य",
  "adm.result": "नतिजा",
  "adm.when": "कहिले",
  "adm.changeSummary": "परिवर्तन सारांश",
  "adm.role": "भूमिका",
  "adm.reason": "कारण",
  "adm.save": "सुरक्षित गर्नुहोस्",
  "adm.apply": "लागू गर्नुहोस्",
  "adm.allStatuses": "सबै स्थिति",
  "adm.allRoles": "सबै भूमिका",
  "adm.allActions": "सबै कार्य",
  "adm.mine": "मेरो",
  "adm.reopenRequested": "पुनः खोल्न अनुरोध",
  "adm.noMatch": "यी फिल्टरसँग मिल्ने केही भेटिएन",
  "adm.takeAction": "कारबाही गर्नुहोस्",
  "adm.description": "विवरण",
  "adm.fullTimeline": "पूर्ण समयरेखा (आन्तरिक)",
  "adm.caseDetail": "मुद्दा विवरण",
  "adm.internalNote": "पछिल्लो आन्तरिक टिप्पणी",
  "adm.citizenFeedback": "नागरिक प्रतिक्रिया",
  "adm.evidence": "प्रमाण",
  "adm.viewPublicPage": "सार्वजनिक पृष्ठ हेर्नुहोस्",
  "adm.public": "सार्वजनिक",
  "adm.internal": "आन्तरिक",
  "adm.reporter": "उजुरीकर्ता",
  "adm.anonymous": "अज्ञात",
  "adm.department": "विभाग",
  "adm.verifiedBy": "प्रमाणित गर्ने",
  "adm.nextUpdate": "अर्को अद्यावधिक म्याद",
  "adm.lastUpdated": "पछिल्लो अद्यावधिक",
  "adm.moveTo": "स्थिति परिवर्तन",
  "adm.assignTo": "जिम्मा तोक्नुहोस्",
  "adm.publicUpdate": "सार्वजनिक अद्यावधिक",
  "adm.resolutionNote": "समाधान टिप्पणी",
  "adm.unchanged": "अपरिवर्तित",
  "adm.accountStatus": "खाता स्थिति",
  "adm.totalAccounts": "कुल खाता",
  "adm.staffAndAdmins": "कर्मचारी र प्रशासक",
  "adm.researchers": "अनुसन्धानकर्ता",
  "adm.verified": "प्रमाणित",
  "adm.pending": "विचाराधीन",
  "adm.rejected": "अस्वीकृत",
  "adm.published": "प्रकाशित",
  "adm.drafts": "मस्यौदा",
  "adm.inPipeline": "प्रक्रियामा",
  "adm.total": "जम्मा",
  "adm.awaitingReview": "समीक्षा पर्खिरहेको",
  "adm.approved": "स्वीकृत",
  "adm.recentDecisions": "हालका निर्णय",
  "adm.configuration": "कन्फिगरेसन",
  "adm.environment": "वातावरण",
  "adm.deliveryLog": "पठाइएको अभिलेख",
  "adm.testSend": "परीक्षण पठाउनुहोस्",
  "adm.messageTypes": "प्रयोगमा रहेका सन्देश प्रकार",
  "adm.queued": "पंक्तिमा",
  "adm.sent": "पठाइयो",
  "adm.failed": "असफल",
  "adm.recipient": "प्राप्तकर्ता",
  "adm.subject": "विषय",
  "adm.created": "सिर्जना",
  "adm.needsAttention": "ध्यान चाहिने",
  "adm.openReports": "खुला उजुरी प्रतिवेदन",
  "adm.visible": "देखिने",
  "adm.nothingToModerate": "नियमन गर्नुपर्ने केही छैन",
  "adm.internalOnlyNote":
    "नागरिक ट्र्याकिङ पृष्ठमा सार्वजनिक अद्यावधिक र स्थिति मात्र देखिन्छ। आन्तरिक टिप्पणी यो स्क्रिनबाट बाहिर जाँदैन।",

  "dash.eyebrow": "नेपाल राजनीतिक इन्टेलिजेन्स प्लेटफर्म",
  "dash.headline": "आज नेपाली राजनीतिमा के भइरहेको छ?",
  "dash.sub": "नेता, निर्वाचन क्षेत्र, प्रतिबद्धता र जनमतको प्रत्यक्ष जानकारी — स्रोतसहित, ट्र्याक गरिएको र हरेक नागरिकका लागि खुला।",
  "dash.explore": "नेताहरू हेर्नुहोस्",
  "dash.trackIssue": "उजुरी ट्र्याक",
  "dash.liveNow": "प्रत्यक्ष",
  "kpi.leaders": "नेताहरू",
  "kpi.constituencies": "निर्वाचन क्षेत्र",
  "kpi.commitments": "प्रतिबद्धता",
  "kpi.opinions": "जनमत",
  "kpi.leadersHint": "प्रोफाइल",
  "kpi.constituenciesHint": "संघीय सिट",
  "kpi.commitmentsHint": "ट्र्याक गरिएको",
  "kpi.opinionsHint": "मूल्याङ्कन र मत",

  "sec.trending": "चर्चामा रहेका नेता",
  "sec.trendingSub": "मापन योग्य गतिविधिका आधारमा — मूल्याङ्कन, तथ्य जाँच र ट्र्याक गरिएका प्रतिबद्धता।",
  "sec.pulse": "निर्वाचन क्षेत्रको नब्ज",
  "sec.pulseSub": "सातै प्रदेश हेर्नुहोस्। प्रदेश छान्नुहोस् र त्यहाँका सिट, उम्मेदवार र खुला उजुरी हेर्नुहोस्।",
  "sec.opinion": "जनमत",
  "sec.opinionSub": "नागरिकले आफ्ना प्रतिनिधिलाई छ आयाममा कसरी मूल्याङ्कन गर्छन्।",
  "sec.commitments": "प्रतिबद्धता ट्र्याकर",
  "sec.commitmentsSub": "हरेक प्रतिबद्धता, त्यसको स्थिति र पछाडिको प्रमाण।",
  "sec.radar": "राजनीतिक रडार",
  "sec.radarSub": "हालै भएका सबै गतिविधि, एकै ठाउँमा।",
  "sec.countdown": "आगामी निर्वाचन मिति",

  "basis.rated": "सार्वजनिक मूल्याङ्कन",
  "basis.factchecked": "तथ्य जाँच भएको",
  "basis.office": "पदमा",
  "basis.incumbent": "बहालवाला",

  "pulse.seats": "सिट",
  "pulse.candidates": "उम्मेदवार",
  "pulse.issues": "खुला उजुरी",
  "pulse.voters": "दर्ता मतदाता",
  "pulse.explore": "यो प्रदेश हेर्नुहोस्",
  "pulse.districts": "ठूला जिल्ला",
  "pulse.federal": "संघीय",
  "pulse.provincial": "प्रादेशिक",
  "pulse.pick": "प्रदेश छान्नुहोस्",

  "sent.positive": "सकारात्मक",
  "sent.neutral": "तटस्थ",
  "sent.negative": "नकारात्मक",
  "op.avgRating": "औसत मूल्याङ्कन",
  "op.dimensions": "आयाम अनुसार",
  "op.noData": "अहिलेसम्म कुनै मूल्याङ्कन छैन",
  "op.noDataHint": "नागरिकले उम्मेदवारलाई मूल्याङ्कन गरेपछि यहाँ धारणा र अंक देखिनेछन्।",
  "op.beFirst": "मूल्याङ्कन गर्नुहोस्",

  "cm.completionRate": "पूर्णता दर",
  "cm.withEvidence": "प्रमाणसहित",
  "cm.recent": "हालै अद्यावधिक",
  "cm.noData": "अहिलेसम्म कुनै प्रतिबद्धता छैन",
  "cm.noDataHint": "प्रकाशित घोषणापत्रबाट सम्पादकीय टोलीले दर्ता गरेपछि प्रतिबद्धता यहाँ देखिनेछ।",
  "cm.browse": "ट्र्याकर खोल्नुहोस्",

  "radar.noData": "अहिलेसम्म केही छैन",
  "radar.news": "समाचार",
  "radar.factcheck": "तथ्य जाँच",
  "radar.issue": "नागरिक उजुरी",
  "radar.result": "विगतको परिणाम",
  "radar.promise": "प्रतिबद्धता",

  "cd.days": "दिन",
  "cd.hours": "घण्टा",
  "cd.minutes": "मिनेट",
  "cd.seconds": "सेकेन्ड",
  "cd.passed": "यो मिति गुज्रिसक्यो",

  "trust.verified": "प्रमाणित",
  "trust.unverified": "अप्रमाणित",
  "trust.historical": "ऐतिहासिक",
  "trust.official": "आधिकारिक तथ्याङ्क",
  "trust.source": "स्रोत",
  "trust.checked": "जाँचिएको",
  "trust.lastUpdated": "पछिल्लो अद्यावधिक",
  "trust.pendingReview": "प्रमाणीकरण बाँकी उम्मेदवार विवरण",
  "trust.corroborated": "उम्मेदवार विवरण भिडाइएको",
  "trust.corroboratedNote":
    "नाम, निर्वाचन क्षेत्र र दल २०२६ को आम निर्वाचनको प्रकाशित सदस्य सूचीसँग भिडाइएको। द्वितीयक स्रोत — निर्वाचन आयोगको आफ्नै अभिलेखसँग अझै पुष्टि भएको छैन।",
  "trust.noVerifiedElection": "हालको प्रमाणित निर्वाचन अभिलेख छैन",
  "trust.latestElection": "पछिल्लो प्रमाणित निर्वाचन",
  "trust.pollingDay": "मतदान दिन",
  "trust.seats": "सिट",
  "trust.fptp": "पहिलो हुने निर्वाचित",
  "trust.pr": "समानुपातिक",
  "trust.resultsAt": "पूर्ण परिणाम निर्वाचन आयोगमा",
  "trust.countingDone": "मतगणना सम्पन्न",
  "trust.noResultsHeld":
    "दलगत सिट सङ्ख्या यहाँ देखाइएको छैन: एउटै स्रोतबाट आएकाले र यो प्लेटफर्मले भिडाएपछि मात्र तथ्यका रूपमा राख्ने भएकाले।",
  "trust.historicalNote":
    "ऐतिहासिक अभिलेख। पारदर्शिताका लागि राखिएको र हालको तथ्याङ्कबाट छुट्याइएको।",
  "trust.unverifiedNote":
    "यो अभिलेख आधिकारिक स्रोतसँग पुष्टि हुन सकेन र हालको मानिँदैन।",

  // ---- प्रमाणीकरण तह
  "tier.OFFICIAL": "आधिकारिक रूपमा प्रमाणित",
  "tier.NETATRACK": "NetaTrack प्रमाणित",
  "tier.UNVERIFIED": "अप्रमाणित",
  "tier.DISPUTED": "विवादित",
  "tier.OFFICIAL.note": "सम्बन्धित निकायको आफ्नै प्रकाशित अभिलेखसँग भिडाइएको।",
  "tier.NETATRACK.note":
    "NetaTrack ले प्रकाशित दोस्रो स्रोतसँग भिडाएको। निकायको आफ्नै अभिलेखबाट अझै पुष्टि भइसकेको छैन।",
  "tier.UNVERIFIED.note":
    "कुनै प्रकाशित स्रोतबाट अझै पुष्टि भएको छैन। पारदर्शिताका लागि देखाइएको, तथ्यका रूपमा होइन।",
  "tier.DISPUTED.note": "प्रकाशित स्रोतहरूबीच यस अभिलेखमा मतभेद छ। नखुलेसम्म सावधानी अपनाउनुहोस्।",
  "tier.sources": "स्रोतहरू",
  "tier.noSource": "कुनै स्रोत अभिलेख छैन",
  "tier.dataAsOf": "तथ्याङ्क मिति",

  // ---- उम्मेदवार प्रोफाइल
  "cand.notRecorded": "अझै अभिलेख छैन",
  "cand.notRecordedHint":
    "यस खण्डका लागि स्रोतसहितको अभिलेख थपिएको छैन। NetaTrack अनुमान होइन, रिक्तता नै देखाउँछ।",
  "cand.notRecordedShort": "अभिलेख छैन",
  "cand.lastUpdated": "पछिल्लो अद्यावधिक",
  "cand.disclaimer":
    "NetaTrack ले जनचेतना र तुलनाका लागि तथ्यपरक सूचना उपलब्ध गराउँछ। यसले कुनै पनि राजनीतिक दल वा उम्मेदवारलाई समर्थन वा सिफारिस गर्दैन।",
  "cand.dataCompleteness": "अभिलेख भएका खण्ड",
  "cand.completenessHint": "कम्तीमा एउटा स्रोतसहितको अभिलेख भएका खण्ड",
  "cand.currentPosition": "हालको पद",
  "cand.politicalExperience": "राजनीतिक अनुभव",
  "cand.province": "प्रदेश",
  "cand.constituency": "निर्वाचन क्षेत्र",
  "cand.prMember": "समानुपातिक सदस्य",
  "cand.noSeatHint": "समानुपातिक सूचीबाट निर्वाचित भएकाले कुनै एक निर्वाचन क्षेत्र लागू हुँदैन।",
  "cand.educationUnverified":
    "शिक्षाको विवरण छ तर कुनै स्रोतले पुष्टि नगरेकाले प्रकाशित गरिएको छैन। स्रोत भएमा मात्र यो विवरण देखाइन्छ।",

  "cand.electionHistory": "निर्वाचन इतिहास",
  "cand.historyEmpty": "यी नेताको निर्वाचन अभिलेख छैन",
  "cand.historyEmptyHint":
    "निर्वाचन आयोगको अभिलेख प्रविष्ट र प्रमाणित भएपछि उम्मेदवारी र आधिकारिक परिणाम यहाँ देखिनेछन्।",
  "cand.elected": "निर्वाचित",
  "cand.notElected": "निर्वाचित भएनन्",
  "cand.resultPending": "प्रकाशित परिणाम छैन",
  "cand.bs": "वि.सं.",
  "cand.votes": "मत",
  "cand.voteShare": "मत हिस्सा",
  "cand.rank": "क्रम",
  "cand.marginWon": "यति मतले विजयी",
  "cand.marginBehind": "विजेताभन्दा यति मत पछाडि",

  "cand.politicalPerformance": "राजनीतिक कार्यसम्पादन",
  "cand.performanceEmpty": "कार्यसम्पादन अभिलेख प्रकाशित छैन",
  "cand.performanceEmptyHint":
    "भरपर्दो प्रकाशित अभिलेख भएमा उपस्थिति, प्रश्न, विधेयक र समिति सहभागिता यहाँ देखिनेछ। NetaTrack यी अङ्क अनुमान गर्दैन।",
  "cand.performanceNote":
    "वस्तुनिष्ठ, स्रोतसहितका क्रियाकलाप अभिलेख। धारणामा आधारित मूल्याङ्कनभन्दा छुट्टै राखिएको।",
  "cand.mAttendance": "उपस्थिति",
  "cand.mQuestions": "उठाइएका प्रश्न",
  "cand.mBills": "विधेयक तथा प्रस्ताव",
  "cand.mCommittee": "समिति बैठक",
  "cand.mLocal": "क्षेत्रगत क्रियाकलाप",
  "cand.mResponses": "मुद्दामा प्रतिक्रिया",

  "cand.pTotal": "कुल प्रतिबद्धता",
  "cand.pCompleted": "पूरा भएको",
  "cand.pInProgress": "प्रगतिमा",
  "cand.pDelayed": "ढिलाइ",
  "cand.pNotStarted": "सुरु नभएको",
  "cand.pCancelled": "रद्द",
  "cand.pUnknown": "अप्रमाणित",
  "cand.pCompletedShare": "पूरा",
  "cand.promisesEmpty": "कुनै प्रतिबद्धता अभिलेख छैन",
  "cand.promisesEmptyHint":
    "घोषणापत्रका प्रतिबद्धता स्रोतसहित थपिन्छन् र समयक्रममा अनुगमन गरिन्छ। यी नेताको हकमा कुनै अभिलेख छैन।",

  "cand.news": "पछिल्ला अद्यावधिक",
  "cand.newsEmpty": "सम्बन्धित समाचार जोडिएको छैन",
  "cand.newsEmptyHint":
    "सम्पादकले समाचारलाई नेतासँग जोड्छन्। समाचारको पाठमा नाम खोजेर स्वतः जोड्दा गलत आरोपण हुन सक्ने भएकाले त्यसो गरिँदैन।",

  "cand.errorTitle": "यो प्रोफाइल लोड गर्न सकिएन",
  "cand.errorHint":
    "अभिलेख पढ्ने क्रममा त्रुटि भयो। तथ्याङ्क यथावत् छ — पुनः प्रयास गर्नुहोस्; दोहोरिए यो हाम्रो पक्षको समस्या हो।",
  "cand.retry": "पुनः प्रयास",
  "cand.loading": "लोड हुँदै",
  "cand.independent": "स्वतन्त्र",
  "cand.ratings": "मूल्याङ्कन",
  "cand.noRatingsYet": "अहिलेसम्म कुनै मूल्याङ्कन छैन। पहिलो मूल्याङ्कन तपाईंले गर्नुहोस्।",
  "cand.distribution": "वितरण",
  "cand.opinionNote": "प्रयोगकर्ताबाट प्राप्त जनमत। यो आधिकारिक निर्वाचन परिणाम होइन।",
  "cand.rateLogin": "गरेर मूल्याङ्कन गर्नुहोस्। प्रमाणित प्रयोगकर्ताले मात्र मूल्याङ्कन गर्न सक्छन्, र प्रत्येक खाताले एक नेतालाई एकपटक मात्र मूल्याङ्कन गर्न पाउँछ।",
  "cand.rateOwn": "तपाईंले आफ्नै प्रोफाइल मूल्याङ्कन गर्न सक्नुहुन्न।",
  "cand.contestsRecorded": "अभिलेख भएका निर्वाचन",
  "cand.termsHint": "कार्यकाल",
  "cand.sourcesCount": "स्रोत",
  "cand.sourcesHint": "यस प्रोफाइलका उद्धरण",
  "cand.promise": "प्रतिबद्धता",
  "cand.status": "स्थिति",
  "cand.evidence": "प्रमाण",
  "cand.documents": "उम्मेदवारले पेस गरेका कागजात",
  "cand.noSourceRecords": "कुनै स्रोत जोडिएको छैन",
  "cand.noSourceHint": "यस प्रोफाइलको कुनै पनि विवरणमा उद्धरण छैन। स्रोत नथपिएसम्म सबै विवरण अप्रमाणित मान्नुहोस्।",
  "cand.factCheckNote": "तथ्य जाँच स्वतन्त्र सम्पादकीय अभिलेख हो। नेताले प्रतिक्रिया राख्न सक्छन् तर निष्कर्ष परिवर्तन गर्न सक्दैनन्।",
  "cand.claimBody": "पहिचान पुष्टिपछि नेताहरूले प्रोफाइल दाबी गरी अनुमति भएका विवरण सम्पादन गर्न सक्छन्। सम्पादकीय अभिलेख, प्रमाणीकरण निर्णय र तथ्य जाँच स्वतन्त्र रहन्छन्।",
  "cand.claimCta": "यो प्रोफाइल दाबी गर्नुहोस्",
  "nav.methodology": "कार्यविधि",
};

const DICTIONARIES: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, ne };

export type Translator = (key: TranslationKey) => string;

export function translator(locale: Locale): Translator {
  const dictionary = DICTIONARIES[locale] ?? {};
  return (key) => dictionary[key] ?? en[key] ?? key;
}

/**
 * Nepali uses Devanagari digits in running text. Counts, dates and vote totals
 * read as foreign in Latin numerals to a Nepali reader.
 */
const DEVANAGARI = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function localizeDigits(value: string, locale: Locale): string {
  if (locale !== "ne") return value;
  return value.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]);
}

export function formatCount(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "—";
  return localizeDigits(value.toLocaleString("en-US"), locale);
}

/**
 * A percentage in the reader's own numerals.
 *
 * `formatPercent` in lib/format.ts stays locale-blind because admin tables and
 * exports want a stable Latin form; public pages use this so a Nepali profile
 * does not mix Devanagari vote counts with Latin vote shares.
 */
export function formatPct(
  value: number | null | undefined,
  locale: Locale,
  digits = 2
): string {
  if (value === null || value === undefined) return "—";
  return localizeDigits(`${value.toFixed(digits)}%`, locale);
}


/**
 * Enum value labels.
 *
 * Statuses, roles and verdicts are stored as SCREAMING_SNAKE enums and appear
 * on nearly every screen, so they are translated here rather than through the
 * key dictionary. Values shared across enums (VERIFIED on a complaint and on a
 * candidate, APPROVED on a claim and on an article) carry the same sense, so a
 * flat map is safe and avoids repeating each label per enum.
 */
const ENUM_NE: Record<string, string> = {
  // complaint lifecycle
  SUBMITTED: "दर्ता भएको",
  UNDER_REVIEW: "समीक्षामा",
  VERIFIED: "प्रमाणित",
  ASSIGNED: "जिम्मा तोकिएको",
  ACKNOWLEDGED: "प्राप्ति सुनिश्चित",
  IN_PROGRESS: "प्रगतिमा",
  AWAITING_RESPONSE: "जवाफ पर्खाइमा",
  RESOLVED: "समाधान भएको",
  CLOSED: "बन्द",

  // priority
  LOW: "कम",
  NORMAL: "सामान्य",
  HIGH: "उच्च",
  URGENT: "अत्यावश्यक",

  // verification / claims / accounts
  PENDING: "विचाराधीन",
  REJECTED: "अस्वीकृत",
  APPROVED: "स्वीकृत",
  ACTIVE: "सक्रिय",
  SUSPENDED: "निलम्बित",
  LOCKED: "बन्द गरिएको",
  DELETED: "हटाइएको",

  // promises
  NOT_STARTED: "सुरु नभएको",
  COMPLETED: "पूरा भएको",
  DELAYED: "ढिलाइ भएको",
  CANCELLED: "रद्द",
  UNABLE_TO_VERIFY: "पुष्टि गर्न नसकिने",

  // fact-check verdicts
  TRUE: "सत्य",
  MOSTLY_TRUE: "प्रायः सत्य",
  MISLEADING: "भ्रामक",
  FALSE: "असत्य",
  UNVERIFIED: "अप्रमाणित",
  INSUFFICIENT_EVIDENCE: "अपर्याप्त प्रमाण",

  // editorial workflow
  DRAFT: "मस्यौदा",
  EDITORIAL_REVIEW: "सम्पादकीय समीक्षा",
  SOURCE_REVIEW: "स्रोत समीक्षा",
  PUBLISHED: "प्रकाशित",
  ARCHIVED: "संग्रहित",

  // elections
  UPCOMING: "आगामी",
  LIVE: "मतदान जारी",
  COUNTING: "मतगणना",

  // roles
  SUPER_ADMIN: "प्रमुख प्रशासक",
  ADMIN: "प्रशासक",
  STAFF: "कर्मचारी",
  CITIZEN: "नागरिक",
  CANDIDATE: "उम्मेदवार",
  RESEARCHER: "अनुसन्धानकर्ता",

  // moderation
  VISIBLE: "देखिने",
  FLAGGED: "चिन्ह लगाइएको",
  HIDDEN: "लुकाइएको",
  REMOVED: "हटाइएको",

  // constituency issues and levels
  RAISED: "उठाइएको",
  ONGOING: "जारी",
  PRIORITY: "प्राथमिकता",
  METROPOLITAN: "महानगरपालिका",
  SUB_METROPOLITAN: "उपमहानगरपालिका",
  MUNICIPALITY: "नगरपालिका",
  RURAL_MUNICIPALITY: "गाउँपालिका",
  FEDERAL: "संघीय",
  PROVINCIAL: "प्रादेशिक",
  LOCAL: "स्थानीय",

  // notification delivery
  QUEUED: "पंक्तिमा",
  SENDING: "पठाउँदै",
  SENT: "पठाइयो",
  FAILED: "असफल",

  // nomination
  DECLARED: "घोषित",
  NOMINATED: "मनोनयन",
  ACCEPTED: "स्वीकृत",
  WITHDRAWN: "फिर्ता",
};

/** SCREAMING_SNAKE enum value to a reader-facing label in the active locale. */
export function enumLabel(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  if (locale === "ne" && ENUM_NE[value]) return ENUM_NE[value];
  const lower = value.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
