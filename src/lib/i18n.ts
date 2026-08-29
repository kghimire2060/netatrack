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
