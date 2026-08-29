/**
 * Demo seed. Idempotent: re-running updates rather than duplicating.
 *
 * Creates the role/permission matrix, settings, a full cast of accounts across
 * every role, parties, constituencies, an election with results, candidates
 * with ratings and promises, news, fact checks, polls and a complaint that has
 * travelled the whole lifecycle.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_MATRIX } from "../src/lib/permissions";
import { SETTING_DEFAULTS } from "../src/lib/settings";
import { weightedScore } from "../src/lib/ratings";
import { generateSecret } from "../src/lib/totp";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "NetaTrack#2026";

async function main() {
  console.log("Seeding NetaTrack…");

  // ---------------------------------------------------------------- settings
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as Prisma.InputJsonValue, category: key.split(".")[0] },
    });
  }

  // -------------------------------------------------------- role permissions
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_MATRIX)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role: role as never, permission } },
        update: {},
        create: { role: role as never, permission },
      });
    }
  }
  console.log("  role/permission matrix written");

  // ------------------------------------------------------------------ people
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const account = async (
    email: string,
    fullName: string,
    role: Prisma.UserCreateInput["role"],
    extra: Partial<Prisma.UserCreateInput> = {}
  ) =>
    prisma.user.upsert({
      where: { email },
      update: { fullName, role, status: "ACTIVE", emailVerified: true, ...extra },
      create: {
        email,
        fullName,
        role,
        passwordHash: hash,
        status: "ACTIVE",
        emailVerified: true,
        ...extra,
      },
    });

  const superAdmin = await account("superadmin@netatrack.example", "Anjana Rai", "SUPER_ADMIN", {
    mfaEnabled: false,
    mfaSecret: generateSecret(),
  });
  const admin = await account("admin@netatrack.example", "Bikash Thapa", "ADMIN");
  const staffOps = await account("staff.ops@netatrack.example", "Chandra Gurung", "STAFF");
  const staffEditor = await account("staff.editor@netatrack.example", "Deepa Karki", "STAFF");
  const citizen = await account("citizen@netatrack.example", "Elina Shrestha", "CITIZEN");
  const citizenTwo = await account("citizen2@netatrack.example", "Furba Sherpa", "CITIZEN");
  const researcher = await account("researcher@netatrack.example", "Gita Poudel", "RESEARCHER", {
    researcherApproved: true,
    approvedAt: new Date(),
  });
  const candidateUser = await account("candidate@netatrack.example", "Ram Prasad Sharma", "CANDIDATE");
  console.log("  accounts created");

  // ----------------------------------------------------------------- parties
  const party = async (slug: string, name: string, shortName: string, colorHex: string, ideology: string) =>
    prisma.party.upsert({
      where: { slug },
      update: { name, shortName, colorHex, ideology },
      create: { slug, name, shortName, colorHex, ideology, foundedYear: 1990 },
    });

  const alliance = await party("national-progress-party", "National Progress Party", "NPP", "#1D5FA7", "Centre-left");
  const unity = await party("democratic-unity-front", "Democratic Unity Front", "DUF", "#E31B23", "Centre-right");
  const civic = await party("civic-reform-alliance", "Civic Reform Alliance", "CRA", "#22A447", "Reformist");

  // ---------------------------------------------------------- constituencies
  const constituency = async (
    slug: string,
    name: string,
    district: string,
    province: string,
    registeredVoters: number,
    majorIssues: string
  ) =>
    prisma.constituency.upsert({
      where: { slug },
      update: { registeredVoters, majorIssues },
      create: { slug, name, district, province, registeredVoters, majorIssues, code: slug.toUpperCase() },
    });

  const ktm1 = await constituency("kathmandu-1", "Kathmandu-1", "Kathmandu", "Bagmati", 78_432, "Traffic, air quality, water supply");
  const ktm2 = await constituency("kathmandu-2", "Kathmandu-2", "Kathmandu", "Bagmati", 71_105, "Waste management, road repair");
  const pok1 = await constituency("kaski-1", "Kaski-1", "Kaski", "Gandaki", 64_890, "Tourism infrastructure, landslides");
  const mor3 = await constituency("morang-3", "Morang-3", "Morang", "Koshi", 82_340, "Irrigation, flood control, employment");

  for (const [constituencyRecord, stations] of [
    [ktm1, ["Ratna Rajya School", "Bhrikuti Mandap Hall", "Ward 5 Community Centre"]],
    [ktm2, ["Kalimati Secondary School", "Ward 12 Office"]],
    [pok1, ["Lakeside Community Hall", "Pokhara Model School"]],
    [mor3, ["Biratnagar Higher Secondary", "Ward 7 Office", "Rangeli Community Hall"]],
  ] as const) {
    for (const [index, name] of stations.entries()) {
      const code = `${constituencyRecord.slug}-ps-${index + 1}`.toUpperCase();
      await prisma.pollingStation.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name,
          constituencyId: constituencyRecord.id,
          registeredVoters: 8_000 + index * 1_500,
          address: `${constituencyRecord.district}, ward ${index + 3}`,
        },
      });
    }
  }
  console.log("  geography created");

  // -------------------------------------------------------------- candidates
  type CandidateSeed = {
    slug: string;
    fullName: string;
    partyId: string | null;
    constituencyId: string;
    education: string;
    experience: string;
    previousPositions: string;
    agenda: string;
    keyIssues: string;
    verified: boolean;
    incumbent?: boolean;
    accountId?: string;
  };

  const candidateSeeds: CandidateSeed[] = [
    {
      slug: "ram-prasad-sharma",
      fullName: "Ram Prasad Sharma",
      partyId: alliance.id,
      constituencyId: ktm1.id,
      education: "Master's in Public Administration, Tribhuvan University",
      experience: "10 years in municipal administration; 4 years as ward chair",
      previousPositions: "Ward Chair, Kathmandu Ward 5 (2017–2022)",
      agenda: "Local infrastructure, school access and transparent municipal budgeting.",
      keyIssues: "Education, Infrastructure, Transparency",
      verified: true,
      incumbent: true,
      accountId: candidateUser.id,
    },
    {
      slug: "sita-adhikari",
      fullName: "Sita Adhikari",
      partyId: unity.id,
      constituencyId: ktm1.id,
      education: "Bachelor's in Law, Nepal Law Campus",
      experience: "6 years practising law; 3 years with a health-access NGO",
      previousPositions: "None",
      agenda: "Healthcare access, employment programmes and women's participation.",
      keyIssues: "Health, Employment, Equality",
      verified: true,
    },
    {
      slug: "hari-bahadur-magar",
      fullName: "Hari Bahadur Magar",
      partyId: civic.id,
      constituencyId: ktm1.id,
      education: "Master's in Economics",
      experience: "12 years in development economics and public finance",
      previousPositions: "Adviser, Municipal Finance Committee",
      agenda: "Fiscal transparency, procurement reform and open data.",
      keyIssues: "Transparency, Economy",
      verified: false,
    },
    {
      slug: "maya-tamang",
      fullName: "Maya Tamang",
      partyId: alliance.id,
      constituencyId: ktm2.id,
      education: "Bachelor's in Environmental Science",
      experience: "8 years in waste management and municipal services",
      previousPositions: "Deputy Mayor, Kathmandu Ward 12 (2017–2022)",
      agenda: "Waste management, air quality and green public transport.",
      keyIssues: "Environment, Sanitation",
      verified: true,
      incumbent: true,
    },
    {
      slug: "nirmal-thapa",
      fullName: "Nirmal Thapa",
      partyId: unity.id,
      constituencyId: pok1.id,
      education: "Master's in Tourism Management",
      experience: "15 years in tourism enterprise; chamber of commerce chair",
      previousPositions: "Chair, Kaski Chamber of Commerce",
      agenda: "Tourism infrastructure, disaster preparedness and local jobs.",
      keyIssues: "Tourism, Disaster Preparedness, Employment",
      verified: true,
    },
    {
      slug: "sunita-chaudhary",
      fullName: "Sunita Chaudhary",
      partyId: civic.id,
      constituencyId: mor3.id,
      education: "Bachelor's in Agriculture",
      experience: "9 years in irrigation cooperatives",
      previousPositions: "Secretary, Morang Irrigation Cooperative",
      agenda: "Irrigation, flood control and agricultural credit access.",
      keyIssues: "Agriculture, Flood Control",
      verified: true,
    },
  ];

  const candidates: Record<string, { id: string }> = {};
  for (const seed of candidateSeeds) {
    candidates[seed.slug] = await prisma.candidate.upsert({
      where: { slug: seed.slug },
      update: {
        fullName: seed.fullName,
        education: seed.education,
        experience: seed.experience,
        previousPositions: seed.previousPositions,
        agenda: seed.agenda,
        keyIssues: seed.keyIssues,
        verificationStatus: seed.verified ? "VERIFIED" : "PENDING",
        verifiedAt: seed.verified ? new Date() : null,
        isIncumbent: seed.incumbent ?? false,
        partyId: seed.partyId,
        constituencyId: seed.constituencyId,
        accountId: seed.accountId ?? null,
      },
      create: {
        slug: seed.slug,
        fullName: seed.fullName,
        biography: `${seed.fullName} is standing in this constituency. This biography is demo data.`,
        education: seed.education,
        experience: seed.experience,
        previousPositions: seed.previousPositions,
        agenda: seed.agenda,
        keyIssues: seed.keyIssues,
        verificationStatus: seed.verified ? "VERIFIED" : "PENDING",
        verifiedAt: seed.verified ? new Date() : null,
        isIncumbent: seed.incumbent ?? false,
        partyId: seed.partyId,
        constituencyId: seed.constituencyId,
        accountId: seed.accountId ?? null,
        socialLinks: { Website: "https://example.org", Facebook: "https://facebook.com/example" },
      },
      select: { id: true },
    });

    const existingSource = await prisma.candidateSource.findFirst({
      where: { candidateId: candidates[seed.slug].id, field: "profile" },
    });
    if (!existingSource) {
      await prisma.candidateSource.create({
        data: {
          candidateId: candidates[seed.slug].id,
          field: "profile",
          label: "Election commission nomination record (demo)",
          url: "https://example.org/nomination-record",
          note: "Biography, education and experience cross-checked against the nomination filing.",
          addedById: staffEditor.id,
        },
      });
    }
  }
  console.log("  candidates created");

  // ---------------------------------------------------------------- election
  const election = await prisma.election.upsert({
    where: { slug: "federal-2026" },
    update: { status: "COUNTING" },
    create: {
      slug: "federal-2026",
      name: "Federal Parliamentary Election 2026",
      type: "FEDERAL",
      year: 2026,
      status: "COUNTING",
      electionDate: new Date("2026-11-12"),
      totalSeats: 165,
      description:
        "Demo dataset for the 2026 federal parliamentary election. Figures here are illustrative, not official.",
      sourceName: "Election Commission (demo record)",
      sourceUrl: "https://example.org/election-commission",
    },
  });

  const pastElection = await prisma.election.upsert({
    where: { slug: "federal-2022" },
    update: { status: "COMPLETED" },
    create: {
      slug: "federal-2022",
      name: "Federal Parliamentary Election 2022",
      type: "FEDERAL",
      year: 2022,
      status: "COMPLETED",
      electionDate: new Date("2022-11-20"),
      totalSeats: 165,
      sourceName: "Election Commission (demo record)",
    },
  });

  const events = [
    { title: "Nomination filing opens", offsetDays: 6, detail: "Candidates file nomination papers at the district office." },
    { title: "Final candidate list published", offsetDays: 14, detail: "Objections resolved and the final list is published." },
    { title: "Campaign silence period begins", offsetDays: 40, detail: "No public campaigning is permitted." },
    { title: "Polling day", offsetDays: 42, detail: "Polls open 07:00 and close 17:00." },
    { title: "Counting begins", offsetDays: 43, detail: "Counting starts at district centres." },
  ];
  for (const event of events) {
    const startsAt = new Date(Date.now() + event.offsetDays * 86_400_000);
    const existing = await prisma.electionEvent.findFirst({
      where: { electionId: election.id, title: event.title },
    });
    if (!existing) {
      await prisma.electionEvent.create({
        data: { electionId: election.id, title: event.title, detail: event.detail, startsAt },
      });
    }
  }

  const candidacyPlan: { slug: string; constituencyId: string; partyId: string }[] = [
    { slug: "ram-prasad-sharma", constituencyId: ktm1.id, partyId: alliance.id },
    { slug: "sita-adhikari", constituencyId: ktm1.id, partyId: unity.id },
    { slug: "hari-bahadur-magar", constituencyId: ktm1.id, partyId: civic.id },
    { slug: "maya-tamang", constituencyId: ktm2.id, partyId: alliance.id },
    { slug: "nirmal-thapa", constituencyId: pok1.id, partyId: unity.id },
    { slug: "sunita-chaudhary", constituencyId: mor3.id, partyId: civic.id },
  ];
  for (const plan of candidacyPlan) {
    await prisma.candidacy.upsert({
      where: {
        electionId_candidateId_constituencyId: {
          electionId: election.id,
          candidateId: candidates[plan.slug].id,
          constituencyId: plan.constituencyId,
        },
      },
      update: {},
      create: {
        electionId: election.id,
        candidateId: candidates[plan.slug].id,
        constituencyId: plan.constituencyId,
        partyId: plan.partyId,
        nominationStatus: "ACCEPTED",
        nominatedAt: new Date("2026-09-20"),
      },
    });
  }

  // Verified 2022 results, plus one pending 2026 result awaiting publication.
  const resultPlan = [
    { electionId: pastElection.id, slug: "ram-prasad-sharma", constituencyId: ktm1.id, partyId: alliance.id, votes: 24_318, total: 52_640, winner: true, status: "VERIFIED" as const },
    { electionId: pastElection.id, slug: "sita-adhikari", constituencyId: ktm1.id, partyId: unity.id, votes: 19_204, total: 52_640, winner: false, status: "VERIFIED" as const },
    { electionId: pastElection.id, slug: "hari-bahadur-magar", constituencyId: ktm1.id, partyId: civic.id, votes: 9_118, total: 52_640, winner: false, status: "VERIFIED" as const },
    { electionId: pastElection.id, slug: "maya-tamang", constituencyId: ktm2.id, partyId: alliance.id, votes: 21_770, total: 46_310, winner: true, status: "VERIFIED" as const },
    { electionId: pastElection.id, slug: "nirmal-thapa", constituencyId: pok1.id, partyId: unity.id, votes: 23_455, total: 44_902, winner: true, status: "VERIFIED" as const },
    { electionId: election.id, slug: "sunita-chaudhary", constituencyId: mor3.id, partyId: civic.id, votes: 18_640, total: 51_220, winner: false, status: "PENDING" as const },
  ];
  for (const plan of resultPlan) {
    const voteShare = Math.round((plan.votes / plan.total) * 10_000) / 100;
    const turnoutPct = Math.round((plan.total / 78_432) * 10_000) / 100;
    await prisma.result.upsert({
      where: {
        electionId_constituencyId_candidateId: {
          electionId: plan.electionId,
          constituencyId: plan.constituencyId,
          candidateId: candidates[plan.slug].id,
        },
      },
      update: { votes: plan.votes, voteShare, status: plan.status },
      create: {
        electionId: plan.electionId,
        constituencyId: plan.constituencyId,
        candidateId: candidates[plan.slug].id,
        partyId: plan.partyId,
        votes: plan.votes,
        voteShare,
        totalVotesCast: plan.total,
        turnoutPct: Math.min(100, turnoutPct),
        isWinner: plan.winner,
        status: plan.status,
        sourceName: plan.status === "VERIFIED" ? "Election Commission (demo record)" : null,
        sourceUrl: plan.status === "VERIFIED" ? "https://example.org/results" : null,
        publishedAt: plan.status === "VERIFIED" ? new Date() : null,
      },
    });
  }
  console.log("  elections and results created");

  // ----------------------------------------------------------------- ratings
  const ratingPlan = [
    { userId: citizen.id, slug: "ram-prasad-sharma", scores: [4, 4, 5, 4, 3, 4], comment: "Responsive on local road repairs, less clear on budget detail." },
    { userId: citizenTwo.id, slug: "ram-prasad-sharma", scores: [3, 4, 4, 3, 3, 4], comment: null },
    { userId: researcher.id, slug: "ram-prasad-sharma", scores: [4, 3, 4, 4, 4, 4], comment: null },
    { userId: citizen.id, slug: "sita-adhikari", scores: [4, 5, 3, 4, 4, 4], comment: "Very clear public communication." },
    { userId: citizenTwo.id, slug: "sita-adhikari", scores: [3, 4, 3, 4, 3, 3], comment: null },
    { userId: citizen.id, slug: "maya-tamang", scores: [5, 4, 5, 4, 4, 5], comment: "Waste collection has visibly improved." },
    { userId: citizenTwo.id, slug: "nirmal-thapa", scores: [3, 3, 3, 3, 2, 3], comment: null },
  ];
  for (const plan of ratingPlan) {
    const [publicTrust, communication, localIssueFocus, policyClarity, responsiveness, overall] =
      plan.scores;
    const scores = { publicTrust, communication, localIssueFocus, policyClarity, responsiveness, overall };
    await prisma.rating.upsert({
      where: { userId_candidateId: { userId: plan.userId, candidateId: candidates[plan.slug].id } },
      update: { ...scores, weightedScore: weightedScore(scores), comment: plan.comment },
      create: {
        ...scores,
        weightedScore: weightedScore(scores),
        comment: plan.comment,
        userId: plan.userId,
        candidateId: candidates[plan.slug].id,
      },
    });
  }

  // ------------------------------------------------------- promises and perf
  const manifesto = await prisma.manifesto.findFirst({ where: { title: "NPP Local Commitments 2022" } })
    ?? (await prisma.manifesto.create({
      data: {
        title: "NPP Local Commitments 2022",
        summary: "Commitments published by the National Progress Party for the 2022 election.",
        partyId: alliance.id,
        electionId: pastElection.id,
        sourceUrl: "https://example.org/manifesto-2022",
        publishedAt: new Date("2022-10-01"),
      },
    }));

  const promisePlan = [
    { title: "Build a new public hospital in Ward 5", status: "IN_PROGRESS" as const, category: "Health", evidence: "https://example.org/hospital-progress" },
    { title: "Upgrade the Ward 5–Ward 8 link road", status: "COMPLETED" as const, category: "Infrastructure", evidence: "https://example.org/road-completion" },
    { title: "Create a youth employment programme", status: "DELAYED" as const, category: "Employment", evidence: "https://example.org/employment-report" },
    { title: "Rebuild two school buildings", status: "NOT_STARTED" as const, category: "Education", evidence: null },
    { title: "Publish the municipal budget quarterly", status: "UNABLE_TO_VERIFY" as const, category: "Transparency", evidence: null },
  ];
  for (const plan of promisePlan) {
    const existing = await prisma.promise.findFirst({ where: { title: plan.title } });
    if (existing) continue;
    const promise = await prisma.promise.create({
      data: {
        title: plan.title,
        description: `Commitment recorded from the published manifesto. ${plan.title}.`,
        category: plan.category,
        status: plan.status,
        evidenceUrl: plan.evidence,
        manifestoId: manifesto.id,
        candidateId: candidates["ram-prasad-sharma"].id,
        constituencyId: ktm1.id,
      },
    });
    await prisma.promiseUpdate.create({
      data: {
        promiseId: promise.id,
        status: plan.status,
        note: "Initial status recorded from the published source.",
        evidenceUrl: plan.evidence,
        actorId: staffEditor.id,
      },
    });
  }

  await prisma.performanceRecord.upsert({
    where: {
      candidateId_periodLabel: { candidateId: candidates["ram-prasad-sharma"].id, periodLabel: "2025 session" },
    },
    update: {},
    create: {
      candidateId: candidates["ram-prasad-sharma"].id,
      periodLabel: "2025 session",
      attendancePct: 87.5,
      questionsAsked: 24,
      billsSponsored: 2,
      committeeMeetings: 31,
      constituencyActivities: 46,
      issueResponses: 18,
      sourceName: "Parliamentary secretariat record (demo)",
      sourceUrl: "https://example.org/attendance-2025",
    },
  });
  console.log("  accountability records created");

  // ------------------------------------------------------ news and fact check
  const article = await prisma.newsArticle.upsert({
    where: { slug: "constituency-budget-transparency-review" },
    update: {},
    create: {
      slug: "constituency-budget-transparency-review",
      title: "Constituency budget disclosures reviewed across four districts",
      excerpt:
        "A review of published municipal budget documents found wide variation in how constituency funds are reported.",
      body: `A review of published municipal budget documents across four districts found wide variation in how constituency development funds are reported.

Two of the four municipalities publish quarterly expenditure detail at line-item level. The remaining two publish only an annual summary, making it difficult to trace how allocations are spent.

This article is demonstration content included with the NetaTrack seed dataset. It is not reporting on real events.`,
      category: "Accountability",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: staffEditor.id,
      sources: "Municipal budget documents (demo); district finance office records (demo).",
    },
  });

  const existingRevision = await prisma.newsRevision.findFirst({ where: { articleId: article.id } });
  if (!existingRevision) {
    await prisma.newsRevision.create({
      data: {
        articleId: article.id,
        editorId: admin.id,
        summary: "Corrected the number of municipalities publishing quarterly detail from three to two.",
        isCorrection: true,
      },
    });
  }

  await prisma.factCheck.upsert({
    where: { slug: "claim-road-completed-ahead-of-schedule" },
    update: {},
    create: {
      slug: "claim-road-completed-ahead-of-schedule",
      claim: "The Ward 5–Ward 8 link road was completed six months ahead of schedule.",
      claimant: "Ram Prasad Sharma",
      claimDate: new Date("2026-07-14"),
      claimSource: "https://example.org/campaign-speech",
      verdict: "MOSTLY_TRUE",
      summary:
        "The road was completed ahead of the revised schedule, but the original contract date had already been extended twice.",
      analysis: `The completion certificate is dated four months before the revised contractual deadline.

However, that deadline was itself the product of two extensions to the original 2023 contract. Measured against the original schedule, the work finished nine months late.

This fact check is demonstration content included with the NetaTrack seed dataset.`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      candidateId: candidates["ram-prasad-sharma"].id,
      reviewerId: staffEditor.id,
      editorId: admin.id,
      subjectResponse:
        "The revised schedule was agreed with the municipality after a supply disruption outside our control. We stand by the statement.",
      evidence: {
        create: [
          { label: "Completion certificate (demo)", url: "https://example.org/completion-certificate" },
          { label: "Original 2023 contract (demo)", url: "https://example.org/contract-2023" },
          { label: "Extension approvals (demo)", url: "https://example.org/extensions" },
        ],
      },
    },
  });
  console.log("  editorial content created");

  // ------------------------------------------------------------------- polls
  const existingPoll = await prisma.poll.findUnique({ where: { slug: "top-local-priority-2026" } });
  if (!existingPoll) {
    await prisma.poll.create({
      data: {
        slug: "top-local-priority-2026",
        question: "Which issue should your constituency prioritise in the next year?",
        description: "An indicative public poll. Results are opinion data, not a representative survey.",
        status: "OPEN",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 86_400_000),
        options: {
          create: [
            { label: "Road and transport infrastructure", order: 1 },
            { label: "Healthcare access", order: 2 },
            { label: "Education quality", order: 3 },
            { label: "Waste and sanitation", order: 4 },
            { label: "Employment programmes", order: 5 },
          ],
        },
      },
    });
  }

  // -------------------------------------------------------------- complaints
  const existingComplaint = await prisma.complaint.findUnique({
    where: { trackingId: "NT-ISSUE-00000001" },
  });
  if (!existingComplaint) {
    const resolved = await prisma.complaint.create({
      data: {
        trackingId: "NT-ISSUE-00000001",
        title: "Street light out on Ward 4 main road",
        description:
          "The street light on the main road near the community centre has been out for two weeks. The junction is unsafe after dark.",
        category: "Infrastructure",
        priority: "HIGH",
        status: "RESOLVED",
        province: "Bagmati",
        district: "Kathmandu",
        locationDetail: "Main road junction opposite the Ward 4 community centre",
        constituencyId: ktm1.id,
        reporterId: citizen.id,
        assignedToId: staffOps.id,
        verifiedById: staffOps.id,
        verifiedAt: new Date(Date.now() - 5 * 86_400_000),
        department: "Municipal Works",
        publicResponse: "A replacement fixture was installed and tested.",
        internalNotes: "Fixture replaced; ballast fault confirmed by the electrical team.",
        resolutionNote: "New LED fixture installed and tested on site. Photograph filed with the works order.",
        resolvedAt: new Date(Date.now() - 2 * 86_400_000),
        expectedUpdateAt: new Date(Date.now() - 2 * 86_400_000),
        events: {
          create: [
            { status: "SUBMITTED", actorLabel: "Citizen", publicUpdate: "Issue submitted successfully.", createdAt: new Date(Date.now() - 7 * 86_400_000) },
            { status: "UNDER_REVIEW", actorId: staffOps.id, actorLabel: "Staff", publicUpdate: "Issue received and being checked.", createdAt: new Date(Date.now() - 6 * 86_400_000) },
            { status: "VERIFIED", actorId: staffOps.id, actorLabel: "Staff", publicUpdate: "Issue and location verified.", createdAt: new Date(Date.now() - 5 * 86_400_000) },
            { status: "ASSIGNED", actorId: admin.id, actorLabel: "Admin", publicUpdate: "Assigned to the municipal works team.", createdAt: new Date(Date.now() - 5 * 86_400_000) },
            { status: "IN_PROGRESS", actorId: staffOps.id, actorLabel: "Staff", publicUpdate: "Replacement fixture ordered; installation scheduled.", internalNote: "Stock confirmed at the depot.", createdAt: new Date(Date.now() - 3 * 86_400_000) },
            { status: "RESOLVED", actorId: admin.id, actorLabel: "Admin", publicUpdate: "New light installed and tested.", createdAt: new Date(Date.now() - 2 * 86_400_000) },
          ],
        },
      },
    });
    void resolved;

    await prisma.complaint.create({
      data: {
        trackingId: "NT-ISSUE-00000002",
        title: "Irregular water supply in Ward 12",
        description:
          "Water supply has dropped to two hours every third day since the start of the month. Several households are affected.",
        category: "Water & Sanitation",
        priority: "URGENT",
        status: "IN_PROGRESS",
        province: "Bagmati",
        district: "Kathmandu",
        constituencyId: ktm2.id,
        reporterId: citizenTwo.id,
        assignedToId: staffOps.id,
        verifiedById: staffOps.id,
        verifiedAt: new Date(Date.now() - 1 * 86_400_000),
        department: "Water Supply",
        publicResponse: "The supply line is being inspected for a suspected leak.",
        internalNotes: "Pressure logs requested from the pumping station.",
        expectedUpdateAt: new Date(Date.now() + 2 * 86_400_000),
        events: {
          create: [
            { status: "SUBMITTED", actorLabel: "Citizen", publicUpdate: "Issue submitted successfully.", createdAt: new Date(Date.now() - 3 * 86_400_000) },
            { status: "UNDER_REVIEW", actorId: staffOps.id, actorLabel: "Staff", publicUpdate: "Issue received and being checked.", createdAt: new Date(Date.now() - 2 * 86_400_000) },
            { status: "VERIFIED", actorId: staffOps.id, actorLabel: "Staff", publicUpdate: "Reports confirmed with neighbouring households.", createdAt: new Date(Date.now() - 1 * 86_400_000) },
            { status: "ASSIGNED", actorId: admin.id, actorLabel: "Admin", publicUpdate: "Assigned to the water supply team.", createdAt: new Date(Date.now() - 1 * 86_400_000) },
            { status: "IN_PROGRESS", actorId: staffOps.id, actorLabel: "Staff", publicUpdate: "Line inspection under way.", createdAt: new Date() },
          ],
        },
      },
    });

    await prisma.complaint.create({
      data: {
        trackingId: "NT-ISSUE-00000003",
        title: "Damaged irrigation canal near Rangeli",
        description:
          "A section of the main irrigation canal collapsed after the last rainfall and is no longer carrying water to the eastern fields.",
        category: "Infrastructure",
        priority: "HIGH",
        status: "SUBMITTED",
        province: "Koshi",
        district: "Morang",
        constituencyId: mor3.id,
        contactEmail: "anonymous.reporter@example.org",
        expectedUpdateAt: new Date(Date.now() + 3 * 86_400_000),
        events: {
          create: [
            { status: "SUBMITTED", actorLabel: "Citizen", publicUpdate: "Issue submitted successfully." },
          ],
        },
      },
    });
  }
  console.log("  citizen issues created");

  // ----------------------------------------------------------- a pending claim
  const pendingClaim = await prisma.candidateClaim.findFirst({
    where: { candidateId: candidates["hari-bahadur-magar"].id },
  });
  if (!pendingClaim) {
    await prisma.candidateClaim.create({
      data: {
        reference: "NT-CLAIM-DEMO01",
        candidateId: candidates["hari-bahadur-magar"].id,
        requesterId: citizenTwo.id,
        statement:
          "I am the candidate named on this profile and would like to manage my biography and agenda. My nomination record is linked as evidence.",
        evidenceUrl: "https://example.org/nomination-record",
        status: "SUBMITTED",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorRole: "SUPER_ADMIN",
      action: "system.seed",
      targetType: "System",
      result: "SUCCESS",
      changeSummary: "Demo dataset seeded",
    },
  });

  console.log(`
Seed complete.

  Sign-in accounts (password for all: ${DEMO_PASSWORD})
    superadmin@netatrack.example    Super Admin
    admin@netatrack.example         Admin
    staff.ops@netatrack.example     Staff — issue operations
    staff.editor@netatrack.example  Staff — editorial
    citizen@netatrack.example       Citizen
    citizen2@netatrack.example      Citizen
    candidate@netatrack.example     Candidate (claimed: Ram Prasad Sharma)
    researcher@netatrack.example    Researcher (approved)

  Tracking IDs to try on /track
    NT-ISSUE-00000001  resolved, full timeline
    NT-ISSUE-00000002  in progress
    NT-ISSUE-00000003  just submitted (anonymous)
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
