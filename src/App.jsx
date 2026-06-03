import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Compass,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Heart,
  LineChart,
  Map as MapIcon,
  MapPin,
  MoonStar,
  Plus,
  Search,
  ShieldCheck,
  SquareArrowOutUpRight,
  Star,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { fetchLiveJobs, fetchRecommendedJobs, parseResumeProfile } from "./lib/ai";
import { hasSupabaseConfig, supabase } from "./lib/supabase";

const STORAGE_KEY = "skillbridge-career-studio";
const DEMO_ACCOUNT_EMAIL = "justine.alonzo@student.skillbridge.ph";
const applicationStages = ["Applied", "Reviewed", "Shortlisted", "Interview", "Offer"];

const sidebarItems = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "progress", label: "Progress", icon: LineChart },
  { id: "roadmap", label: "Roadmap", icon: MapIcon },
  { id: "mentorship", label: "Mentorship", icon: Users },
  { id: "certifications", label: "Certifications", icon: ShieldCheck },
];

const premiumApplicantPages = ["progress", "roadmap", "mentorship", "certifications"];

const adminSidebarItems = [
  { id: "users", label: "User Management", icon: Users },
  { id: "courses", label: "Course Management", icon: BookOpen },
  { id: "certifications-admin", label: "Certification Approvals", icon: ShieldCheck },
  { id: "mentors", label: "Mentor Verification", icon: BadgeCheck },
  { id: "employers", label: "Employer Verification", icon: BriefcaseBusiness },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "revenue", label: "Revenue Management", icon: DollarSign },
  { id: "cms", label: "CMS / Content Management", icon: FileText },
];

const accentSequence = ["violet", "mint", "violet", "mint", "violet"];
const genericSkills = new Set(["Communication", "Teamwork", "Documentation", "Excel", "Problem Solving", "Reporting"]);
const seniorRoleKeywords = ["senior", "lead", "principal", "manager", "director", "head", "architect"];
const roleDomainGroups = [
  {
    id: "software",
    keywords: [
      "react",
      "javascript",
      "typescript",
      "node",
      "frontend",
      "backend",
      "full stack",
      "software",
      "developer",
      "engineer",
      "programming",
      "api",
      "sql",
      "git",
      "testing",
      "qa",
    ],
  },
  {
    id: "embedded",
    keywords: [
      "embedded",
      "firmware",
      "microcontroller",
      "arduino",
      "raspberry pi",
      "robotics",
      "iot",
      "electronics",
      "hardware",
      "pcb",
      "circuit",
      "automation",
      "control systems",
    ],
  },
  {
    id: "data",
    keywords: ["analytics", "analysis", "data", "power bi", "excel", "reporting", "business intelligence", "sql"],
  },
  {
    id: "support",
    keywords: ["technical support", "it support", "helpdesk", "troubleshooting", "network", "customer support", "ticketing"],
  },
  {
    id: "design",
    keywords: ["graphic design", "ui", "ux", "figma", "photoshop", "illustrator", "wireframe", "branding"],
  },
  {
    id: "business",
    keywords: ["business analyst", "operations", "administration", "admin", "finance", "accounting", "sales", "marketing", "hr", "recruitment"],
  },
];

function normalizeCategoryForState(category) {
  if (category === "Internship") return "internships";
  if (category === "Volunteer") return "volunteer";
  return "jobs";
}

function formatRelativeDate(value) {
  if (!value) return "recently";

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "recently";

  const diffMs = Date.now() - target.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  return `${diffWeeks} weeks ago`;
}

function formatSalaryMeta(job) {
  if (job.salary_min && job.salary_max) {
    return `PHP ${job.salary_min.toLocaleString()}-PHP ${job.salary_max.toLocaleString()}`;
  }

  if (job.salary_min) {
    return `From PHP ${job.salary_min.toLocaleString()}`;
  }

  return "Salary not listed";
}

function normalizeSearchTerms(values) {
  return values
    .flatMap((value) =>
      String(value || "")
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/),
    )
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

const listingSkillDictionary = [
  "react",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "sql",
  "postgresql",
  "mysql",
  "firebase",
  "tailwind",
  "css",
  "html",
  "graphql",
  "next.js",
  "next",
  "aws",
  "docker",
  "git",
  "rest api",
  "figma",
  "python",
  "java",
  "c#",
  "php",
  "laravel",
  "vue",
  "angular",
  "testing",
  "jest",
  "cypress",
  "communication",
  "teamwork",
  "customer service",
  "crm",
  "sales",
  "marketing",
  "social media",
  "copywriting",
  "graphic design",
  "photoshop",
  "illustrator",
  "excel",
  "accounting",
  "bookkeeping",
  "payroll",
  "recruitment",
  "hr",
  "administration",
  "data entry",
  "documentation",
  "analytics",
  "business analysis",
  "technical support",
  "network",
  "embedded",
  "firmware",
  "microcontroller",
  "arduino",
  "raspberry pi",
  "robotics",
  "iot",
  "linux",
];

function extractListingSkills(...values) {
  const lowered = values.join(" ").toLowerCase();
  const normalized = listingSkillDictionary
    .filter((skill) => lowered.includes(skill))
    .map((skill) => {
      if (skill === "node") return "Node.js";
      if (skill === "next") return "Next.js";
      if (skill === "hr") return "HR";
      if (skill === "crm") return "CRM";
      return skill
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    });

  return [...new Set(normalized)];
}

function clampScore(value, min = 6, max = 98) {
  return Math.max(Math.min(value, max), min);
}

const skillAliasMap = new Map([
  ["c", "c"],
  ["clanguage", "c"],
  ["cprogramming", "c"],
  ["cplusplus", "c++"],
  ["cpp", "c++"],
  ["c++", "c++"],
  ["csharp", "c#"],
  ["c#", "c#"],
  ["css", "css"],
  ["cascadingstylesheets", "css"],
  ["javascript", "javascript"],
  ["js", "javascript"],
  ["typescript", "typescript"],
  ["ts", "typescript"],
  ["react", "react"],
  ["reactjs", "react"],
  ["node", "node.js"],
  ["nodejs", "node.js"],
  ["node.js", "node.js"],
  ["next", "next.js"],
  ["nextjs", "next.js"],
  ["next.js", "next.js"],
  ["postgres", "postgresql"],
  ["postgresql", "postgresql"],
  ["mysql", "mysql"],
  ["sql", "sql"],
  ["hr", "hr"],
  ["humanresources", "hr"],
  ["crm", "crm"],
]);

function normalizeSkillForMatch(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const compact = normalized.replace(/[^a-z0-9+#]/g, "");

  return skillAliasMap.get(compact) ?? skillAliasMap.get(normalized) ?? normalized;
}

function skillsMatch(sourceSkill, targetSkill) {
  const source = normalizeSkillForMatch(sourceSkill);
  const target = normalizeSkillForMatch(targetSkill);

  if (!source || !target) return false;
  if (source === target) return true;

  const sourceTokens = source.split(/[^a-z0-9+#]+/).filter((token) => token.length > 1);
  const targetTokens = target.split(/[^a-z0-9+#]+/).filter((token) => token.length > 1);

  if (sourceTokens.length === 0 || targetTokens.length === 0) return false;
  if (sourceTokens.length === 1 && targetTokens.length === 1) return false;

  return sourceTokens.every((token) => targetTokens.includes(token)) || targetTokens.every((token) => sourceTokens.includes(token));
}

function getOverlapMatches(sourceSkills, targetSkills) {
  return targetSkills.filter((required) =>
    sourceSkills.some((skill) => skillsMatch(skill, required)),
  );
}

function getApplicantSkills(profile) {
  return [...new Set((Array.isArray(profile.skills) ? profile.skills : []).filter(Boolean))];
}

function getApplicantMatchedSkills(applicantSkills, requiredSkills) {
  return applicantSkills.filter((skill) => getOverlapMatches([skill], requiredSkills).length > 0);
}

function sanitizeMatchedSkills(candidateSkills, applicantSkills, requiredSkills = []) {
  const applicantMatches = getOverlapMatches(applicantSkills, candidateSkills);
  if (requiredSkills.length === 0) {
    return [...new Set(applicantMatches)];
  }

  return [...new Set(applicantMatches.filter((skill) => getOverlapMatches([skill], requiredSkills).length > 0))];
}

function filterSpecificMatchedSkills(skills) {
  return [...new Set((skills ?? []).filter((skill) => !isGenericSkill(skill)))];
}

function isGenericSkill(skill) {
  return genericSkills.has(String(skill || "").trim());
}

function countSpecificSkills(skills) {
  return skills.filter((skill) => !isGenericSkill(skill)).length;
}

function isSeniorRole(...values) {
  const text = values.join(" ").toLowerCase();
  return seniorRoleKeywords.some((keyword) => text.includes(keyword));
}

function isJuniorProfile(profile) {
  const years = Number(profile?.aiProfile?.experience_years ?? 0);
  if (Number.isFinite(years) && years > 0) return years < 3;

  const title = String(profile?.jobTitle ?? "").toLowerCase();
  const summary = String(profile?.aiProfile?.summary ?? "").toLowerCase();
  return (
    !title.includes("senior") &&
    !title.includes("lead") &&
    (summary.includes("fresh graduate") ||
      summary.includes("student") ||
      summary.includes("intern") ||
      summary.includes("entry-level") ||
      summary.includes("early-career") ||
      summary.includes("junior"))
  );
}

function detectRoleDomains(values) {
  const text = values.join(" ").toLowerCase();
  return roleDomainGroups
    .filter((group) => group.keywords.some((keyword) => text.includes(keyword)))
    .map((group) => group.id);
}

function getDomainPenalty(profile, listing, matchedSkills) {
  const applicantDomains = detectRoleDomains([
    profile.jobTitle,
    profile.about,
    ...(profile.skills ?? []),
    ...(profile.aiProfile?.suggested_roles ?? []),
    ...(profile.aiProfile?.summary ? [profile.aiProfile.summary] : []),
  ]);
  const listingDomains = detectRoleDomains([
    listing.title,
    listing.meta,
    listing.overview,
    listing.setup,
    ...listing.requiredSkills,
    ...(listing.sourceResponsibilities ?? []),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 0;
  if (applicantDomains.some((domain) => listingDomains.includes(domain))) return 0;

  const specificMatchedCount = countSpecificSkills(matchedSkills);
  return specificMatchedCount === 0 ? 22 : 12;
}

function getDomainMatchBonus(profile, listing) {
  const applicantDomains = detectRoleDomains([
    profile.jobTitle,
    profile.about,
    ...(profile.skills ?? []),
    ...(profile.aiProfile?.suggested_roles ?? []),
    ...(profile.aiProfile?.summary ? [profile.aiProfile.summary] : []),
  ]);
  const listingDomains = detectRoleDomains([
    listing.title,
    listing.meta,
    listing.overview,
    listing.setup,
    ...listing.requiredSkills,
    ...(listing.sourceResponsibilities ?? []),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 0;
  return applicantDomains.some((domain) => listingDomains.includes(domain)) ? 8 : 0;
}

function getDomainAlignmentScore(profile, listing, matchedSkills) {
  const applicantDomains = detectRoleDomains([
    profile.jobTitle,
    profile.about,
    ...(profile.skills ?? []),
    ...(profile.aiProfile?.suggested_roles ?? []),
    ...(profile.aiProfile?.summary ? [profile.aiProfile.summary] : []),
  ]);
  const listingDomains = detectRoleDomains([
    listing.title,
    listing.meta,
    listing.overview,
    listing.setup,
    ...listing.requiredSkills,
    ...(listing.sourceResponsibilities ?? []),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 60;
  if (applicantDomains.some((domain) => listingDomains.includes(domain))) return 100;
  return countSpecificSkills(matchedSkills) > 0 ? 35 : 10;
}

function getExperienceAlignmentScore(profile, listing) {
  const juniorProfile = isJuniorProfile(profile);
  const seniorRole = isSeniorRole(listing.title, listing.meta, listing.overview, listing.setup);

  if (juniorProfile && seniorRole) return 20;
  if (!juniorProfile && seniorRole) return 90;
  return 82;
}

function computeWeightedAverageScore(components) {
  const weightedTotal = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return totalWeight > 0 ? weightedTotal / totalWeight : 0;
}

function getScoreToneClass(score) {
  if (score >= 80) return "score-green";
  if (score >= 60) return "score-yellow";
  return "score-red";
}

function getSkillEvidenceCeiling(requiredCount, matchedCount, roleOverlapCount = 0, contextOverlapCount = 0) {
  if (matchedCount <= 0) {
    return clampScore(42 + Math.min(roleOverlapCount * 3, 8) + Math.min(contextOverlapCount, 2) * 2);
  }

  const normalizedRequired = Math.max(requiredCount, matchedCount, 1);
  const coverage = matchedCount / normalizedRequired;
  const ceiling =
    38 +
    matchedCount * 10 +
    coverage * 24 +
    Math.min(roleOverlapCount * 2, 8) +
    Math.min(contextOverlapCount, 2) * 2;

  return clampScore(Math.round(ceiling));
}

function computeListingSimilarity(listing, profile, recommendation = null) {
  const profileSkills = getApplicantSkills(profile);
  const requiredSkills =
    Array.isArray(listing.requiredSkills) && listing.requiredSkills.length > 0
      ? listing.requiredSkills
      : extractListingSkills(listing.title, listing.meta, listing.overview, listing.setup, ...(listing.sourceResponsibilities ?? []));
  const rawMatchedSkills =
    recommendation?.matched_skills?.length
      ? sanitizeMatchedSkills(recommendation.matched_skills, profileSkills, requiredSkills)
      : getOverlapMatches(profileSkills, requiredSkills);
  const matchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);
  const suggestedRoles = profile.aiProfile?.suggested_roles ?? [];
  const listingTerms = new Set(
    normalizeSearchTerms([listing.title, listing.meta, listing.overview, listing.setup, ...(listing.sourceResponsibilities ?? []), ...requiredSkills]),
  );
  const roleTerms = normalizeSearchTerms([profile.jobTitle, ...suggestedRoles]);
  const contextTerms = normalizeSearchTerms([
    profile.about,
    profile.aiProfile?.summary,
    ...(profile.aiProfile?.strengths ?? []),
    ...(profile.aiProfile?.keywords ?? []),
  ]);
  const roleOverlapCount = roleTerms.filter((term) => listingTerms.has(term)).length;
  const contextOverlapCount = contextTerms.filter((term) => listingTerms.has(term)).length;

  const profileLocation = String(profile.location || "").trim().toLowerCase();
  const locationScore =
    profileLocation && `${listing.meta} ${listing.setup}`.toLowerCase().includes(profileLocation)
      ? 8
      : 0;

  const matchedCount = rawMatchedSkills.length;
  const specificMatchedCount = countSpecificSkills(matchedSkills);
  const specificRequiredSkills = requiredSkills.filter((skill) => !isGenericSkill(skill));
  const genericRequiredSkills = requiredSkills.filter((skill) => isGenericSkill(skill));
  const specificMatchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);
  const genericMatchedSkills = rawMatchedSkills.filter((skill) => isGenericSkill(skill));
  const gapList =
    recommendation?.skill_gaps?.length
      ? recommendation.skill_gaps
      : requiredSkills.filter((required) => !getOverlapMatches(rawMatchedSkills, [required]).length);
  const specificCoverageRatio =
    specificRequiredSkills.length > 0
      ? specificMatchedSkills.length / specificRequiredSkills.length
      : specificMatchedSkills.length > 0
        ? 0.45
        : 0;
  const genericCoverageRatio =
    genericRequiredSkills.length > 0
      ? genericMatchedSkills.length / genericRequiredSkills.length
      : genericMatchedSkills.length > 0
        ? 0.35
        : 0;
  const skillAlignmentScore = clampScore(Math.round(specificCoverageRatio * 85 + genericCoverageRatio * 15), 0, 100);
  const roleAlignmentScore = clampScore(
    Math.round(
      Math.min(roleOverlapCount * 26, 100) +
        (suggestedRoles.length > 0 &&
        suggestedRoles.some((role) => listing.title.toLowerCase().includes(String(role).toLowerCase().replace(/\bintern(ship)?\b/g, "").trim()))
          ? 12
          : 0),
    ),
    0,
    100,
  );
  const domainAlignmentScore = getDomainAlignmentScore(profile, listing, matchedSkills);
  const experienceAlignmentScore = getExperienceAlignmentScore(profile, listing);
  const contextAlignmentScore = clampScore(Math.round(Math.min(contextOverlapCount * 20 + locationScore * 6, 100)), 0, 100);
  let fallbackScore = Math.round(
    computeWeightedAverageScore([
      { score: skillAlignmentScore, weight: 0.5 },
      { score: roleAlignmentScore, weight: 0.2 },
      { score: domainAlignmentScore, weight: 0.15 },
      { score: experienceAlignmentScore, weight: 0.1 },
      { score: contextAlignmentScore, weight: 0.05 },
    ]),
  );
  if (profileSkills.length > 0 && specificMatchedSkills.length === 0) {
    fallbackScore = Math.min(fallbackScore, genericMatchedSkills.length > 0 ? 52 : 38);
  }
  if (specificRequiredSkills.length > 0 && specificMatchedSkills.length === 0) {
    fallbackScore = Math.min(fallbackScore, 48);
  }
  if (domainAlignmentScore < 40) {
    fallbackScore = Math.min(fallbackScore, specificMatchedSkills.length > 0 ? 58 : 34);
  }
  if (experienceAlignmentScore <= 20) {
    fallbackScore = Math.min(fallbackScore, 42);
  }
  const evidenceCeiling = getSkillEvidenceCeiling(requiredSkills.length, matchedCount, roleOverlapCount, contextOverlapCount);
  const finalScore = clampScore(Math.min(fallbackScore, evidenceCeiling));

  return {
    matchedSkills,
    rawMatchedSkills,
    score: finalScore,
    fallbackScore: clampScore(fallbackScore),
    judgeScore: typeof recommendation?.match_score === "number" ? clampScore(recommendation.match_score, 0, 100) : null,
  };
}

const announcementSlides = [
  {
    id: 1,
    tag: "Pinned",
    label: "Career Launch",
    title: "Fresh graduate and internship opportunities just opened across partner companies",
    body:
      "Students and early-career applicants can now explore verified roles in frontend, QA, operations, and product support with AI-powered fit scoring.",
    link: "Open this week's opportunities",
    date: "May 26, 2026",
    targetSidebar: "discover",
    targetCategory: "jobs",
  },
  {
    id: 2,
    tag: "Update",
    label: "Mentorship",
    title: "New mentor sessions are available for portfolio reviews and interview preparation",
    body:
      "Book time with working professionals to improve your resume, portfolio, and communication before applying to roles.",
    link: "View mentor sessions",
    date: "May 27, 2026",
    targetSidebar: "mentorship",
  },
  {
    id: 3,
    tag: "Guide",
    label: "Skill Match",
    title: "Applicants with complete profiles are seeing stronger match percentages this week",
    body:
      "Add stronger summaries, updated skills, and clearer project details to improve how the platform evaluates your fit for each job posting.",
    link: "Improve your profile",
    date: "May 28, 2026",
    targetSidebar: "discover",
    openProfile: true,
  },
  {
    id: 4,
    tag: "New",
    label: "Volunteer",
    title: "Volunteer job listings now appear beside paid roles for students building experience",
    body:
      "Use volunteer opportunities to gain practical work, strengthen your portfolio, and build confidence before entering full-time applications.",
    link: "Browse volunteer jobs",
    date: "May 29, 2026",
    targetSidebar: "discover",
    targetCategory: "volunteer",
  },
];

const categories = [
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { id: "internships", label: "Internships", icon: BookOpen },
  { id: "volunteer", label: "Volunteer Jobs", icon: Users },
];

const applicantProfileTabs = [
  { id: "info", label: "Info" },
  { id: "skills", label: "Skills" },
  { id: "resume", label: "Resume" },
];

const adminProfileTabs = [
  { id: "info", label: "Account" },
  { id: "security", label: "Security" },
];

const seedListings = [
  {
    id: 1,
    category: "jobs",
    company: "KodaStack",
    title: "Junior Frontend Developer",
    meta: "Hybrid | Quezon City | PHP 28k-PHP 38k",
    overview:
      "Join KodaStack's product team to build polished web experiences for internal dashboards and client-facing tools used by growing startups.",
    setup: "Full-time | Entry level | Hybrid setup",
    responsibilities: [
      "Build and refine reusable React interface components",
      "Translate design handoff into responsive frontend screens",
      "Work with backend teammates on API integration and bug fixes",
    ],
    employerNotes: [
      "Strong attention to UI details",
      "Can explain project decisions clearly",
      "Open to coaching and code review feedback",
    ],
    posted: "2 days ago",
    applicants: 46,
    requiredSkills: ["React", "JavaScript", "Git", "TypeScript", "API Integration"],
    scoreBase: 91,
    gaps: ["TypeScript", "API Integration", "Testing"],
    accent: "violet",
    initial: "K",
  },
  {
    id: 2,
    category: "jobs",
    company: "Northstar Digital",
    title: "Graduate Product Associate",
    meta: "Remote | Manila | PHP 25k-PHP 32k",
    overview:
      "Support product operations, user research, and release coordination for a digital services team focused on early growth products.",
    setup: "Full-time | Graduate role | Remote",
    responsibilities: [
      "Gather product feedback from users and internal teams",
      "Prepare reports, documentation, and release checklists",
      "Coordinate with design, engineering, and operations stakeholders",
    ],
    employerNotes: [
      "Clear written communication matters",
      "Comfortable working across multiple teams",
      "Curious about product thinking and user experience",
    ],
    posted: "5 days ago",
    applicants: 31,
    requiredSkills: ["Research", "Analytics", "Presentation", "Coordination"],
    scoreBase: 78,
    gaps: ["Analytics", "Presentation", "Stakeholder Handling", "Product Sense"],
    accent: "mint",
    initial: "N",
  },
  {
    id: 3,
    category: "jobs",
    company: "Pixel Harbor",
    title: "Product Support Associate",
    meta: "Remote | Cebu | PHP 24k-PHP 30k",
    overview:
      "Help customers resolve platform issues while improving internal support workflows, documentation quality, and service reliability.",
    setup: "Full-time | Entry level | Remote",
    responsibilities: [
      "Respond to product questions and issue reports",
      "Document recurring bugs and escalate critical cases",
      "Maintain support articles and troubleshooting guides",
    ],
    employerNotes: [
      "Empathy and patience with users",
      "Good documentation habits",
      "Able to spot patterns in repeated issues",
    ],
    posted: "1 week ago",
    applicants: 52,
    requiredSkills: ["Communication", "Documentation", "Problem Solving", "Helpdesk Tools"],
    scoreBase: 74,
    gaps: ["Helpdesk Tools", "Documentation"],
    accent: "mint",
    initial: "P",
  },
  {
    id: 4,
    category: "internships",
    company: "Brightlane Labs",
    title: "Software QA Intern",
    meta: "On-site | Makati | 400 internship hours",
    overview:
      "Work with the QA team on manual testing, bug documentation, and release verification for client projects under active development.",
    setup: "Internship | OJT-ready | On-site",
    responsibilities: [
      "Execute test cases for new product features",
      "Document bugs clearly with screenshots and reproduction steps",
      "Assist in regression checks before release",
    ],
    employerNotes: [
      "Detail-oriented and organized",
      "Can communicate issues clearly",
      "Willing to learn structured QA workflows",
    ],
    posted: "4 days ago",
    applicants: 31,
    requiredSkills: ["Testing", "Communication", "Documentation", "Bug Reporting"],
    scoreBase: 84,
    gaps: ["Testing", "Bug Reporting", "Regression Planning"],
    accent: "violet",
    initial: "B",
  },
  {
    id: 5,
    category: "internships",
    company: "ArcSphere",
    title: "UI/UX Design Intern",
    meta: "Hybrid | Pasig | 300 internship hours",
    overview:
      "Support the design team with wireframes, interface reviews, and user flow improvements for student-friendly digital products.",
    setup: "Internship | Hybrid | Portfolio-focused",
    responsibilities: [
      "Create wireframes and interface explorations in Figma",
      "Assist in documenting user journeys and design decisions",
      "Support design system cleanup across active screens",
    ],
    employerNotes: [
      "Strong visual curiosity",
      "Comfortable receiving design critique",
      "Can think about usability beyond aesthetics",
    ],
    posted: "3 days ago",
    applicants: 18,
    requiredSkills: ["Figma", "Wireframing", "UI Design", "User Flows"],
    scoreBase: 80,
    gaps: ["Figma", "Design Systems"],
    accent: "mint",
    initial: "A",
  },
  {
    id: 6,
    category: "volunteer",
    company: "Code for Communities",
    title: "Volunteer Web Support Associate",
    meta: "Remote | Nationwide | Weekend-based",
    overview:
      "Contribute to community websites and civic campaigns by handling content updates, small UI fixes, and accessibility improvements.",
    setup: "Volunteer | Weekend-based | Remote",
    responsibilities: [
      "Update website pages and content sections",
      "Fix basic layout and formatting issues",
      "Help improve accessibility and navigation clarity",
    ],
    employerNotes: [
      "Community-minded and reliable",
      "Comfortable collaborating asynchronously",
      "Willing to help with practical maintenance work",
    ],
    posted: "2 days ago",
    applicants: 14,
    requiredSkills: ["HTML", "CSS", "CMS", "Teamwork"],
    scoreBase: 76,
    gaps: ["CMS", "Accessibility"],
    accent: "mint",
    initial: "C",
  },
];

const progressTabs = [
  { id: "courses", label: "Mentorship Courses" },
  { id: "prep", label: "Certification Prep" },
];

const progressCards = [
  {
    id: 1,
    type: "courses",
    mentor: "Priya Nair",
    role: "Staff Engineer @ Airbnb",
    title: "GraphQL Mastery: From Basics to Production",
    status: "In Progress",
    statusClass: "in-progress",
    weeks: "3/8 weeks",
    progress: 38,
    accent: "violet",
    initial: "PN",
    scores: [
      { label: "Week 1 Quiz", value: 88, accent: "mint" },
      { label: "Week 2 Quiz", value: 91, accent: "mint" },
      { label: "Week 3 Assignment", value: 79, accent: "violet" },
    ],
    average: 86,
    tags: ["GraphQL", "Apollo Client", "Schema Design"],
    next: "Jun 4, 2026",
  },
  {
    id: 2,
    type: "courses",
    mentor: "Sarah Rodriguez",
    role: "Senior Engineer @ Airbnb",
    title: "React Performance Optimization",
    status: "Completed",
    statusClass: "completed",
    weeks: "4/4 weeks",
    progress: 100,
    accent: "mint",
    initial: "SR",
    scores: [
      { label: "Week 1 Quiz", value: 95, accent: "mint" },
      { label: "Week 2 Assignment", value: 88, accent: "mint" },
      { label: "Final Project", value: 92, accent: "mint" },
    ],
    average: 92,
    tags: ["React", "Profiling", "Rendering"],
    next: "Completed",
  },
  {
    id: 3,
    type: "prep",
    mentor: "Ava Chen",
    role: "Cloud Mentor @ AWS Community",
    title: "AWS Cloud Practitioner Readiness",
    status: "In Progress",
    statusClass: "in-progress",
    weeks: "2/5 weeks",
    progress: 42,
    accent: "violet",
    initial: "AC",
    scores: [
      { label: "Domain 1 Quiz", value: 81, accent: "mint" },
      { label: "Domain 2 Quiz", value: 76, accent: "violet" },
      { label: "Practice Exam", value: 68, accent: "violet" },
    ],
    average: 75,
    tags: ["Cloud Concepts", "Security", "Billing"],
    next: "Jun 10, 2026",
  },
  {
    id: 4,
    type: "prep",
    mentor: "Marco Lee",
    role: "Data Mentor @ Google Dev Groups",
    title: "SQL Analytics Certification Sprint",
    status: "Ready",
    statusClass: "ready",
    weeks: "5/5 weeks",
    progress: 100,
    accent: "mint",
    initial: "ML",
    scores: [
      { label: "Practice Test 1", value: 93, accent: "mint" },
      { label: "Practice Test 2", value: 90, accent: "mint" },
      { label: "Final Mock Exam", value: 89, accent: "mint" },
    ],
    average: 91,
    tags: ["SQL", "Dashboards", "Data Analysis"],
    next: "Exam Ready",
  },
];

const roadmapBlueprint = [
  {
    id: 1,
    label: "Now",
    range: "Current",
    status: "Complete",
    statusClass: "completed",
    title: "React & TypeScript Foundation",
    nodeClass: "done",
    skills: ["React", "TypeScript", "Git Workflow"],
    actions: ["Refine component structure", "Practice state handling", "Document two strong projects"],
  },
  {
    id: 2,
    label: "Phase 1",
    range: "Weeks 1-6",
    status: "Active",
    statusClass: "in-progress",
    title: "Close Critical Skill Gaps",
    nodeClass: "active",
    skills: ["GraphQL", "PostgreSQL"],
    actions: [
      "Enroll: GraphQL Zero to Production",
      "Enroll: PostgreSQL for Developers",
      "Build a GraphQL API side project",
    ],
  },
  {
    id: 3,
    label: "Phase 2",
    range: "Weeks 7-14",
    title: "Infrastructure & Architecture",
    nodeClass: "future",
    skills: ["System Design", "Deployment", "Observability"],
    actions: ["Start cloud foundations", "Ship one deployable full-stack app", "Review system design basics weekly"],
  },
  {
    id: 4,
    label: "Target",
    range: "Month 4+",
    title: "Senior Full-Stack Engineer",
    nodeClass: "future",
    skills: ["Architecture", "Leadership", "Product Thinking"],
    actions: ["Build a stronger portfolio story", "Lead one end-to-end project", "Prepare for technical interviews"],
  },
];

const mentorshipCourses = [
  {
    id: 1,
    mentor: "Priya Nair",
    role: "Staff Engineer @ Airbnb",
    title: "GraphQL Mastery: From Basics to Production",
    description: "Build real-world GraphQL APIs with Apollo Server, subscriptions, and caching strategies used at scale.",
    tags: ["GraphQL", "Apollo Client", "Schema Design", "Subscriptions"],
    duration: "8 weeks",
    schedule: "2x/week live + recordings",
    start: "Jun 2, 2026",
    spotsLeft: 20,
    enrolled: 847,
    rating: 4.95,
    price: "$299",
    accent: "violet",
    initial: "PN",
    badges: ["Most Popular", "Intermediate"],
  },
  {
    id: 2,
    mentor: "Marcus Chen",
    role: "Eng Manager @ Shopify",
    title: "System Design for Senior Engineers",
    description: "Crack system design interviews and architect scalable distributed systems from scratch.",
    tags: ["System Design", "Scalability", "Databases", "Microservices"],
    duration: "6 weeks",
    schedule: "1x/week live + office hours",
    start: "Jun 9, 2026",
    spotsLeft: 15,
    enrolled: 612,
    rating: 4.88,
    price: "$249",
    accent: "mint",
    initial: "MC",
    badges: ["High Demand", "Advanced"],
  },
  {
    id: 3,
    mentor: "Lena Torres",
    role: "Product Lead @ Vercel",
    title: "Frontend Career Launch Lab",
    description: "Sharpen your frontend portfolio, communication, and delivery process for fresh grad hiring.",
    tags: ["Portfolio", "Frontend", "Career Prep", "React"],
    duration: "5 weeks",
    schedule: "Weekly live critique",
    start: "Jun 15, 2026",
    spotsLeft: 12,
    enrolled: 403,
    rating: 4.91,
    price: "$199",
    accent: "violet",
    initial: "LT",
    badges: ["Career Track", "Beginner"],
  },
  {
    id: 4,
    mentor: "Adrian Park",
    role: "Cloud Architect @ Microsoft",
    title: "Cloud Foundations for Developers",
    description: "Understand deployment, cloud services, and system tradeoffs for modern engineering roles.",
    tags: ["Cloud", "Architecture", "DevOps", "Deployment"],
    duration: "7 weeks",
    schedule: "2x/week evening cohort",
    start: "Jun 20, 2026",
    spotsLeft: 18,
    enrolled: 529,
    rating: 4.86,
    price: "$279",
    accent: "mint",
    initial: "AP",
    badges: ["Mentor-led", "Intermediate"],
  },
];

const certificationCategories = ["All", "Cloud", "Frontend", "Database", "DevOps"];

const certifications = [
  {
    id: 1,
    provider: "AWS",
    level: "Associate",
    track: "Cloud",
    title: "AWS Certified Developer - Associate",
    subtitle: "AWS | $150",
    description: "Validates ability to develop and deploy cloud-native applications on AWS.",
    tags: ["AWS Lambda", "DynamoDB", "S3", "CloudFormation", "API Gateway"],
    relevance: 88,
  },
  {
    id: 2,
    provider: "GCP",
    level: "Professional",
    track: "Cloud",
    title: "Google Professional Cloud Developer",
    subtitle: "Google | $200",
    description: "Demonstrates the ability to build scalable and highly available applications using Google Cloud.",
    tags: ["GCP", "Kubernetes", "Cloud Run", "BigQuery", "Pub/Sub"],
    relevance: 76,
  },
  {
    id: 3,
    provider: "Meta",
    level: "Professional",
    track: "Frontend",
    title: "Meta Front-End Developer Certificate",
    subtitle: "Meta | Free (Coursera)",
    description: "Industry-recognized credential for front-end development skills, issued by Meta.",
    tags: ["React", "HTML/CSS", "JavaScript", "UI/UX", "Testing"],
    relevance: 95,
  },
  {
    id: 4,
    provider: "PostgreSQL",
    level: "Associate",
    track: "Database",
    title: "PostgreSQL Developer Foundations",
    subtitle: "PostgreSQL Org | $99",
    description: "Covers query design, indexing, schema management, and data modeling essentials.",
    tags: ["SQL", "Indexing", "Joins", "Optimization", "Schema Design"],
    relevance: 82,
  },
];

const initialApplicationStatus = {};

const guestProfile = {
  fullName: "Guest User",
  username: "@guest",
  role: "Visitor",
  email: "",
  avatarUrl: "",
  firstName: "",
  lastName: "",
  jobTitle: "",
  location: "",
  portfolio: "",
  about: "Sign in to save jobs, track applications, and build your profile.",
  skills: [],
  linkedIn: "",
  resumeFileName: "No resume uploaded",
  resumeUploadedAt: "Upload your resume to unlock better matches",
  resumeText: "",
  aiProfile: null,
};

function createBaseUserProfile(role) {
  if (role === "Admin") {
    return adminProfile;
  }

  if (role === "Employer") {
    return {
      ...guestProfile,
      role: "Employer",
      jobTitle: "Hiring Team",
      about: "Employer account for posting roles, reviewing applicants, and connecting with students, interns, and fresh graduates.",
    };
  }

  return {
    ...guestProfile,
    role: "Applicant",
    about: "Add your actual profile details and upload your resume to unlock AI-matched jobs.",
  };
}

const adminProfile = {
  fullName: "SkillBridge Admin",
  username: "@skillbridge.admin",
  role: "Admin",
  email: "admin@skillbridge.ph",
  avatarUrl: "",
  firstName: "SkillBridge",
  lastName: "Admin",
  jobTitle: "Platform Administrator",
  location: "Manila, PH",
  portfolio: "admin.skillbridge.ph",
  about: "Platform administrator handling approvals, verifications, content operations, and marketplace health across the SkillBridge ecosystem.",
  skills: ["Operations", "Verification", "Analytics", "Content Review"],
  linkedIn: "",
  resumeFileName: "Admin_Operations_Profile.pdf",
  resumeUploadedAt: "Updated May 26, 2026",
  resumeText: "",
  aiProfile: null,
};

const defaultState = {
  theme: "dark",
  activeSidebar: "discover",
  activeCategory: "jobs",
  subscription: {
    status: "free",
    plan: "Free",
    renewalDate: "",
  },
  applicationsTab: "applied",
  expandedApplicationId: 1,
  progressTab: "courses",
  expandedRoadmapId: 2,
  profilePanelOpen: false,
  profilePanelTab: "info",
  selectedJobId: null,
  selectedAdminUserId: null,
  selectedAdminCertificationId: null,
  adminUserActionId: "",
  authModalOpen: false,
  authMode: "login",
  mentorshipApplied: [],
  certificationFilter: "All",
  certificationPractice: [],
  certificationPortalVisits: [],
  liveJobs: [],
  aiRecommendations: [],
  aiStatus: {
    loadingJobs: false,
    analyzingResume: false,
    refreshingRecommendations: false,
    error: "",
    updatedAt: "",
    lastAutoRecommendationKey: "",
  },
  applicationStatusById: initialApplicationStatus,
  profileSavedAt: "",
  auth: {
    isAuthenticated: false,
    accountId: "",
    accountName: "",
    accountEmail: "",
    accountRole: "Applicant",
    password: "",
  },
  profile: guestProfile,
  applications: [],
  saved: [],
  profileExperience: [],
  profileCertificates: [],
  volunteerActivities: [],
  adminUsers: [],
  adminCourses: [
    { id: 1, title: "GraphQL Mastery", owner: "Priya Nair", status: "Published" },
    { id: 2, title: "Frontend Career Launch Lab", owner: "Lena Torres", status: "Review" },
    { id: 3, title: "Cloud Foundations", owner: "Adrian Park", status: "Draft" },
  ],
  adminCertifications: [],
  adminMentors: [
    { id: 1, name: "Marcus Chen", specialty: "System Design", status: "Pending" },
    { id: 2, name: "Sarah Rodriguez", specialty: "React Performance", status: "Verified" },
  ],
  adminEmployers: [
    { id: 1, company: "Northstar Digital", industry: "Product Services", status: "Pending" },
    { id: 2, company: "KodaStack", industry: "Software", status: "Verified" },
  ],
  adminRevenue: [
    { id: 1, label: "Mentorship Enrollments", amount: "PHP 182,000", status: "Collected" },
    { id: 2, label: "Certification Partnerships", amount: "PHP 74,000", status: "Pending Payout" },
  ],
  adminContent: [
    { id: 1, title: "Homepage Announcement Banner", status: "Published" },
    { id: 2, title: "Employer Help Center Article", status: "Draft" },
    { id: 3, title: "Student OJT Application Guide", status: "Review" },
  ],
};

function isLegacyDemoState(savedState) {
  return (
    savedState?.auth?.accountEmail === DEMO_ACCOUNT_EMAIL ||
    savedState?.profile?.email === DEMO_ACCOUNT_EMAIL ||
    savedState?.profile?.fullName === "Justine Alonzo"
  );
}

function mapProfileRecordToState(record, fallbackUser = null) {
  const role = record?.role || fallbackUser?.user_metadata?.role || "Applicant";
  const baseProfile = createBaseUserProfile(role);
  const aiProfile =
    record?.ai_profile && typeof record.ai_profile === "object" && Object.keys(record.ai_profile).length > 0
      ? record.ai_profile
      : null;
  const resumeMetadata = record?.resume_metadata && typeof record.resume_metadata === "object" ? record.resume_metadata : {};
  const fullName = record?.full_name || fallbackUser?.user_metadata?.full_name || baseProfile.fullName;
  const firstName = record?.first_name || fallbackUser?.user_metadata?.first_name || fullName.split(" ")[0] || "";
  const lastName =
    record?.last_name || fallbackUser?.user_metadata?.last_name || fullName.split(" ").slice(1).join(" ") || "";

  return {
    ...baseProfile,
    fullName,
    username:
      record?.username ||
      (fullName ? `@${fullName.toLowerCase().replace(/\s+/g, ".")}` : baseProfile.username),
    role,
    email: record?.email || fallbackUser?.email || "",
    avatarUrl: record?.avatar_url || baseProfile.avatarUrl,
    firstName,
    lastName,
    jobTitle: record?.job_title || baseProfile.jobTitle,
    location: record?.location || baseProfile.location,
    portfolio: record?.portfolio_url || baseProfile.portfolio,
    linkedIn: record?.linkedin_url || baseProfile.linkedIn,
    about: record?.about || baseProfile.about,
    skills: Array.isArray(record?.skills) ? record.skills : baseProfile.skills,
    resumeFileName: resumeMetadata.fileName || baseProfile.resumeFileName,
    resumeUploadedAt: resumeMetadata.uploadedAt || baseProfile.resumeUploadedAt,
    resumeText: record?.resume_text || "",
    aiProfile,
  };
}

function createProfileUpdatePayload(profile) {
  return {
    full_name: profile.fullName,
    first_name: profile.firstName,
    last_name: profile.lastName,
    username: profile.username,
    role: profile.role,
    email: profile.email,
    avatar_url: profile.avatarUrl || null,
    job_title: profile.jobTitle,
    location: profile.location,
    portfolio_url: profile.portfolio,
    linkedin_url: profile.linkedIn,
    about: profile.about,
    skills: profile.skills,
    resume_text: profile.resumeText || null,
    ai_profile: profile.aiProfile ?? {},
    last_resume_parsed_at: profile.aiProfile ? new Date().toISOString() : null,
    resume_metadata: {
      fileName: profile.resumeFileName,
      uploadedAt: profile.resumeUploadedAt,
    },
  };
}

function formatAdminUserStatus(status) {
  if (status === "Active") return "Verified";
  return status || "Pending";
}

function getAdminStatusClass(status) {
  if (status === "Pending") return "reviewed";
  if (status === "Active") return "ready";
  return "saved";
}

function mapAdminUserRecord(record) {
  return {
    id: record.id,
    name: record.full_name || record.email || "Unnamed user",
    role: record.role || "Applicant",
    status: record.status || "Pending",
    joined: formatRelativeDate(record.created_at) === "recently" ? getTodayLongDate() : getTodayLongDateFromValue(record.created_at),
    email: record.email || "",
    username: record.username || "",
    location: record.location || "",
    title: record.job_title || "",
    about: record.about || "",
    skills: Array.isArray(record.skills) ? record.skills : [],
  };
}

function mapCertificateSubmissionRecord(record) {
  const provider = record.provider || "Unknown provider";
  const submittedAtLabel = record.created_at ? getTodayLongDateFromValue(record.created_at) : getTodayLongDate();

  return {
    id: record.id,
    applicantId: record.applicant_id,
    title: record.title || "Untitled certificate",
    source: provider,
    provider,
    date: record.issue_date_label || `Submitted ${submittedAtLabel}`,
    submittedDate: record.issue_date_label || `Submitted ${submittedAtLabel}`,
    status: record.status || "Pending",
    photoName: record.proof_file_name || "",
    photoPreview: record.proof_image_data_url || "",
    uploadedByName: record.uploaded_by_name || "Unknown uploader",
    uploadedByEmail: record.uploaded_by_email || "",
    uploadedByRole: record.uploaded_by_role || "",
    uploadedByTitle: record.uploaded_by_title || "",
    uploadedByLocation: record.uploaded_by_location || "",
    uploadedAt: submittedAtLabel,
  };
}

function App() {
  const [state, setState] = useState(defaultState);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState("");
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "Applicant" });
  const [authFeedback, setAuthFeedback] = useState("");
  const [experienceForm, setExperienceForm] = useState({ title: "", company: "", period: "", years: "" });
  const [certificateForm, setCertificateForm] = useState({ title: "", source: "", date: "", photoName: "", photoPreview: "" });
  const [volunteerForm, setVolunteerForm] = useState({ org: "", role: "", status: "Active", last: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [isRenewalNoticeDismissed, setIsRenewalNoticeDismissed] = useState(false);
  const isAdmin = state.auth.isAuthenticated && state.auth.accountRole === "Admin";
  const hasActiveSubscription = state.auth.isAuthenticated && state.subscription?.status === "active";
  const renewalDate = state.subscription?.renewalDate ? new Date(state.subscription.renewalDate) : null;
  const daysBeforeRenewal = renewalDate && !Number.isNaN(renewalDate.getTime())
    ? Math.ceil((renewalDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const showRenewalNotice =
    !isAdmin &&
    hasActiveSubscription &&
    !isRenewalNoticeDismissed &&
    daysBeforeRenewal !== null &&
    daysBeforeRenewal >= 0 &&
    daysBeforeRenewal <= 7;


  useEffect(() => {
    setIsRenewalNoticeDismissed(false);
  }, [state.subscription?.status, state.subscription?.renewalDate]);

  function formatSubscriptionDate(dateValue) {
    if (!dateValue) return "No renewal date yet";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "No renewal date yet";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (isLegacyDemoState(parsed)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setState((current) => ({ ...current, ...parsed }));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return undefined;

    let cancelled = false;

    async function syncFromSession(session) {
      if (!session?.user) {
        if (cancelled) return;

        setState((current) => ({
          ...current,
          authModalOpen: false,
          authMode: "login",
          activeSidebar: "discover",
          auth: {
            ...current.auth,
            isAuthenticated: false,
            accountId: "",
            accountName: "",
            accountEmail: "",
            accountRole: "Applicant",
            password: "",
          },
          subscription: {
            status: "free",
            plan: "Free",
            renewalDate: "",
          },
          profile: guestProfile,
          profileCertificates: [],
          adminCertifications: [],
        }));
        return;
      }

      const { data: profileRecord } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileRecord?.status === "Suspended") {
        await handleSuspendedAccount(profileRecord.email || session.user.email || "");
        return;
      }

      const mappedProfile = mapProfileRecordToState(profileRecord, session.user);
      let subscriptionState = {
        status: "free",
        plan: "Free",
        renewalDate: "",
      };

      if (mappedProfile.role !== "Admin") {
        const { data: subscriptionRecord } = await supabase
          .from("subscriptions")
          .select("plan,status,renewal_date")
          .eq("user_id", session.user.id)
          .order("renewal_date", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (subscriptionRecord) {
          subscriptionState = {
            status: subscriptionRecord.status || "free",
            plan: subscriptionRecord.plan || "Applicant Premium",
            renewalDate: subscriptionRecord.renewal_date || "",
          };
        }
      }

      setState((current) => ({
        ...current,
        authModalOpen: false,
        authMode: "login",
        activeSidebar: mappedProfile.role === "Admin" ? "analytics" : current.activeSidebar === "analytics" ? "discover" : current.activeSidebar,
        auth: {
          ...current.auth,
          isAuthenticated: true,
          accountId: session.user.id,
          accountName: mappedProfile.fullName,
          accountEmail: mappedProfile.email,
          accountRole: mappedProfile.role,
          password: "",
        },
        subscription: subscriptionState,
        profile: mappedProfile,
      }));
    }

    supabase.auth.getSession().then(({ data }) => {
      syncFromSession(data.session).catch(() => {});
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthFeedback("");
        setAuthForm((current) => ({
          ...current,
          email: session?.user?.email ?? current.email,
          password: "",
          confirmPassword: "",
        }));
        setState((current) => ({
          ...current,
          authModalOpen: true,
          authMode: "reset",
        }));
      }

      syncFromSession(session).catch(() => {});
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveAnnouncement((current) => (current + 1) % announcementSlides.length);
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    let cancelled = false;

    setState((current) => ({
      ...current,
      aiStatus: {
        ...current.aiStatus,
        loadingJobs: true,
        error: "",
      },
    }));

    fetchLiveJobs()
      .then((jobs) => {
        if (cancelled) return;

        setState((current) => ({
          ...current,
          liveJobs: jobs,
          aiStatus: {
            ...current.aiStatus,
            loadingJobs: false,
          },
        }));
      })
      .catch((error) => {
        if (cancelled) return;

        setState((current) => ({
          ...current,
          aiStatus: {
            ...current.aiStatus,
            loadingJobs: false,
            error: error.message,
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !isAdmin) return;

    let cancelled = false;

    loadAdminUsers(cancelled).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !state.auth.isAuthenticated || !state.auth.accountId) return;

    let active = true;

    async function checkCurrentUserStatus() {
      const { data, error } = await supabase
        .from("profiles")
        .select("status, email")
        .eq("id", state.auth.accountId)
        .maybeSingle();

      if (!active || error || !data) return;

      if (data.status === "Suspended") {
        await handleSuspendedAccount(data.email || state.auth.accountEmail || "");
      }
    }

    const channel = supabase
      .channel(`profile-status-${state.auth.accountId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${state.auth.accountId}`,
        },
        async (payload) => {
          if (payload.new?.status === "Suspended") {
            await handleSuspendedAccount(payload.new?.email || state.auth.accountEmail || "");
          }
        },
      )
      .subscribe();

    checkCurrentUserStatus().catch(() => {});

    const intervalId = window.setInterval(() => {
      checkCurrentUserStatus().catch(() => {});
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkCurrentUserStatus().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [state.auth.accountEmail, state.auth.accountId, state.auth.isAuthenticated]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !state.auth.accountId) return;

    let cancelled = false;

    supabase
      .from("certificate_submissions")
      .select("*")
      .eq("applicant_id", state.auth.accountId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error) return;

        setState((current) => ({
          ...current,
          profileCertificates: (data ?? []).map(mapCertificateSubmissionRecord),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [state.auth.accountId]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !isAdmin) return;

    let cancelled = false;

    supabase
      .from("certificate_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error) return;

        setState((current) => ({
          ...current,
          adminCertifications: (data ?? []).map(mapCertificateSubmissionRecord),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const profileInitials = useMemo(
    () =>
      state.profile.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    [state.profile.fullName],
  );

  const recommendationMap = useMemo(
    () => new Map(state.aiRecommendations.map((item) => [String(item.job_id), item])),
    [state.aiRecommendations],
  );

  const listings = useMemo(
    () => {
      const remoteListings = state.liveJobs.map((job, index) => {
        const recommendation = recommendationMap.get(String(job.id));
        const applicantSkills = getApplicantSkills(state.profile);
        const resolvedRequiredSkills =
          job.required_skills?.length
            ? job.required_skills
            : extractListingSkills(job.title, job.description, ...(job.responsibilities ?? []));
        const matchedSkills = recommendation?.matched_skills?.length
          ? sanitizeMatchedSkills(recommendation.matched_skills, applicantSkills, resolvedRequiredSkills)
          : getOverlapMatches(applicantSkills, resolvedRequiredSkills);
        const skillGaps =
          recommendation?.skill_gaps ??
          resolvedRequiredSkills.filter((required) => !getOverlapMatches(applicantSkills, [required]).length);

        return {
          id: job.id,
          category: normalizeCategoryForState(job.category),
          company: job.company_name,
          title: job.title,
          meta: `${job.work_type || "Flexible"} | ${job.location || "Philippines"} | ${formatSalaryMeta(job)}`,
          overview: job.description,
          sourceDescription: job.description,
          setup: `${job.category} | ${job.work_type || "Flexible"} | ${job.source_platform || "External listing"}`,
          responsibilities: job.responsibilities?.length ? job.responsibilities : [],
          sourceResponsibilities: job.responsibilities?.length ? job.responsibilities : [],
          employerNotes: [
            job.work_type
              ? `${job.work_type} setup with coordination expectations set by the employer`
              : "Flexible setup based on employer needs",
            job.location
              ? `Role is aligned to ${job.location} hiring coverage`
              : "Location details should be confirmed on the original posting",
            `Review the original ${job.source_platform || "external"} listing before submitting`,
          ],
          posted: formatRelativeDate(job.posted_at),
          applicants: recommendation ? Math.max(9, recommendation.match_score - 20) : 12 + index * 4,
          requiredSkills:
            resolvedRequiredSkills,
          scoreBase: recommendation?.match_score ?? 76,
          gaps: skillGaps,
          accent: accentSequence[index % accentSequence.length],
          initial: job.company_name.charAt(0).toUpperCase(),
          sourceUrl: job.source_url,
          aiReason: recommendation?.reason ?? "",
          matchedSkills,
        };
      });

      return remoteListings.map((listing) => {
        const recommendation = recommendationMap.get(String(listing.id));
        const similarity = computeListingSimilarity(listing, state.profile, recommendation);
        const matchedSkills = similarity.matchedSkills;
        const rawMatchedSkills = similarity.rawMatchedSkills;
        const gaps =
          recommendation?.skill_gaps ??
          listing.requiredSkills.filter((required) => !getOverlapMatches(rawMatchedSkills, [required]).length);

        return {
          ...listing,
          score: similarity.score,
          scoreTone: getScoreToneClass(similarity.score),
          aiReason: recommendation?.reason ?? listing.aiReason ?? "",
          matchedSkills,
          gaps,
          rawMatchedSkills: similarity.rawMatchedSkills,
        };
      });
    },
    [recommendationMap, state.liveJobs, state.profile],
  );

  const rankedListings = useMemo(() => [...listings].sort((left, right) => right.score - left.score), [listings]);

  const filteredListings = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return rankedListings
      .filter((listing) => {
        const matchesCategory = listing.category === state.activeCategory;
        const haystack = [listing.title, listing.company, listing.meta, ...listing.requiredSkills].join(" ").toLowerCase();
        return matchesCategory && haystack.includes(normalized);
      })
      .sort((left, right) => right.score - left.score);
  }, [rankedListings, searchQuery, state.activeCategory]);

  const autoRecommendationKey = useMemo(() => {
    if (!state.profile.aiProfile) return "";

    return [
      state.profile.resumeFileName,
      state.profile.resumeUploadedAt,
      state.profile.jobTitle,
      state.profile.location,
      state.profile.skills.join("|"),
      state.liveJobs.length,
    ].join("::");
  }, [
    state.liveJobs.length,
    state.profile.aiProfile,
    state.profile.jobTitle,
    state.profile.location,
    state.profile.resumeFileName,
    state.profile.resumeUploadedAt,
    state.profile.skills,
  ]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    if (!state.profile.aiProfile) return;
    if (state.liveJobs.length === 0) return;
    if (state.aiRecommendations.length > 0) return;
    if (state.aiStatus.refreshingRecommendations || state.aiStatus.analyzingResume) return;
    if (state.aiStatus.lastAutoRecommendationKey === autoRecommendationKey) return;

    refreshRecommendations(state.profile, state.profile.aiProfile, {
      autoKey: autoRecommendationKey,
    }).catch(() => {});
  }, [
    state.aiRecommendations.length,
    state.aiStatus.lastAutoRecommendationKey,
    state.aiStatus.analyzingResume,
    state.aiStatus.refreshingRecommendations,
    state.liveJobs.length,
    state.profile,
    autoRecommendationKey,
  ]);

  useEffect(() => {
    const listingIds = new Set(listings.map((listing) => String(listing.id)));

    setState((current) => {
      const applications = current.applications.filter((id) => listingIds.has(String(id)));
      const saved = current.saved.filter((id) => listingIds.has(String(id)));
      const selectedJobId = current.selectedJobId && listingIds.has(String(current.selectedJobId)) ? current.selectedJobId : null;
      const expandedApplicationId =
        current.expandedApplicationId && listingIds.has(String(current.expandedApplicationId)) ? current.expandedApplicationId : null;

      if (
        applications.length === current.applications.length &&
        saved.length === current.saved.length &&
        selectedJobId === current.selectedJobId &&
        expandedApplicationId === current.expandedApplicationId
      ) {
        return current;
      }

      return {
        ...current,
        applications,
        saved,
        selectedJobId,
        expandedApplicationId,
      };
    });
  }, [listings]);

  const counts = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: rankedListings.filter((listing) => listing.category === category.id).length,
      })),
    [rankedListings],
  );

  const appliedCards = useMemo(
    () =>
      listings
        .filter((listing) => state.applications.includes(listing.id))
        .map((listing) => ({
          ...listing,
          ...(state.applicationStatusById[listing.id] ?? createApplicationEntry()),
        })),
    [listings, state.applications, state.applicationStatusById],
  );

  const savedCards = useMemo(
    () => listings.filter((listing) => state.saved.includes(listing.id) && !state.applications.includes(listing.id)),
    [listings, state.saved, state.applications],
  );

  const activeApplicationCards = state.applicationsTab === "applied" ? appliedCards : savedCards;
  const appliedCount = appliedCards.length;
  const inProgressCount = appliedCards.filter((card) => ["Reviewed", "Shortlisted"].includes(card.status)).length;
  const interviewCount = appliedCards.filter((card) => card.status === "Interview").length;
  const visibleProgressCards = progressCards.filter((card) => card.type === state.progressTab);
  const enrolledCourses = progressCards.filter((card) => card.type === "courses").length;
  const avgCompletion = Math.round(
    visibleProgressCards.reduce((sum, card) => sum + card.progress, 0) / Math.max(visibleProgressCards.length, 1),
  );
  const certsReady = `${progressCards.filter((card) => card.type === "prep" && ["Ready", "Completed"].includes(card.status)).length}/${
    progressCards.filter((card) => card.type === "prep").length
  }`;
  const roadmapItems = roadmapBlueprint.map((item) => ({
    ...item,
    expanded: state.expandedRoadmapId === item.id,
  }));
  const filteredCertifications = certifications.filter(
    (item) => state.certificationFilter === "All" || item.track === state.certificationFilter,
  );
  const selectedJob = listings.find((listing) => listing.id === state.selectedJobId) ?? null;
  const selectedJobRecommendation = selectedJob ? recommendationMap.get(String(selectedJob.id)) ?? null : null;
  const selectedJobMatchedSkills = selectedJob
    ? getRelevantSkills(selectedJob)
    : [];
  const selectedJobFitReason = selectedJob
    ? (() => {
        const matchedSkills = selectedJobMatchedSkills;
        const topMatchedSkills = matchedSkills.slice(0, 3);
        const topGaps = selectedJob.gaps.slice(0, 2);
        const applicantDirection =
          state.profile.jobTitle ||
          state.profile.aiProfile?.suggested_roles?.[0] ||
          "your current career direction";

        if (topMatchedSkills.length > 0) {
          return `This role fits ${applicantDirection} because your profile already shows strength in ${topMatchedSkills.join(", ")}. ${
            topGaps.length > 0 ? `If you improve ${topGaps.join(" and ")}, you can become an even stronger match for this position.` : "You already cover the strongest signals this employer is asking for."
          }`;
        }

        return `This role is directionally relevant to ${applicantDirection}, but you still need to build up ${topGaps.join(" and ") || "more role-specific skills"} before it becomes a strong fit for your current profile.`;
      })()
    : "";
  const topRecommendations = rankedListings.slice(0, 3);
  const currentSidebarItems = isAdmin ? adminSidebarItems : sidebarItems;
  const profileTabs = isAdmin ? adminProfileTabs : applicantProfileTabs;
  const registeredAdminUsers = state.adminUsers.filter((item) => item.role !== "Admin");
  const filteredAdminUsers = useMemo(() => {
    const normalized = adminUserSearchQuery.trim().toLowerCase();

    if (!normalized) return registeredAdminUsers;

    return registeredAdminUsers.filter((item) =>
      [item.name, item.email, item.role, item.title, item.location, item.username]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [adminUserSearchQuery, registeredAdminUsers]);
  const selectedAdminUser = registeredAdminUsers.find((item) => item.id === state.selectedAdminUserId) ?? null;
  const selectedAdminCertification = state.adminCertifications.find((item) => item.id === state.selectedAdminCertificationId) ?? null;
  const adminOverview = {
    totalUsers: registeredAdminUsers.length,
    pendingReviews:
      state.adminCertifications.filter((item) => item.status === "Pending").length +
      state.adminMentors.filter((item) => item.status === "Pending").length +
      state.adminEmployers.filter((item) => item.status === "Pending").length,
    liveContent: state.adminContent.filter((item) => item.status === "Published").length,
  };

  useEffect(() => {
    if (currentSidebarItems.some((item) => item.id === state.activeSidebar)) return;

    setState((current) => ({
      ...current,
      activeSidebar: isAdmin ? "analytics" : "discover",
    }));
  }, [currentSidebarItems, isAdmin, state.activeSidebar]);

  useEffect(() => {
    if (profileTabs.some((tab) => tab.id === state.profilePanelTab)) return;

    setState((current) => ({
      ...current,
      profilePanelTab: "info",
    }));
  }, [profileTabs, state.profilePanelTab]);

  function patchState(patch) {
    setState((current) => ({ ...current, ...patch }));
  }

  function patchAuthForm(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

  function patchProfile(field, value) {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }));
  }

  function patchExperienceForm(field, value) {
    setExperienceForm((current) => ({ ...current, [field]: value }));
  }

  function patchCertificateForm(field, value) {
    setCertificateForm((current) => ({ ...current, [field]: value }));
  }

  function patchVolunteerForm(field, value) {
    setVolunteerForm((current) => ({ ...current, [field]: value }));
  }

  function patchPasswordForm(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSuspendedAccount(email = "") {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    }

    setAuthFeedback("This account has been suspended. Please contact support or an administrator for assistance.");
    setState((current) => ({
      ...current,
      authModalOpen: true,
      authMode: "login",
      activeSidebar: "discover",
      auth: {
        ...current.auth,
        isAuthenticated: false,
        accountId: "",
        accountName: "",
        accountEmail: email || current.auth.accountEmail || "",
        accountRole: "Applicant",
        password: "",
      },
      profile: guestProfile,
      profileCertificates: [],
      adminCertifications: [],
    }));
  }

  async function loadAdminUsers(cancelled = false) {
    if (!hasSupabaseConfig || !supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, status, created_at, email, username, location, job_title, about, skills")
      .order("created_at", { ascending: false });

    if (cancelled) return;

    if (error) {
      setAuthFeedback(error.message || "Unable to load the registered users.");
      return;
    }

    setState((current) => ({
      ...current,
      adminUsers: (data ?? []).map(mapAdminUserRecord),
    }));
  }

  async function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAuthFeedback("Upload an image file for your profile photo.");
      event.target.value = "";
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setAuthFeedback("Profile photos must be 1.5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const avatarUrl = await readFileAsDataUrl(file);
      setState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          avatarUrl,
        },
      }));
      setAuthFeedback("");
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : "Unable to load the selected profile photo.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleCertificatePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAuthFeedback("Upload an image file for the certificate proof.");
      event.target.value = "";
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setAuthFeedback("Certificate proof images must be 1.5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const photoPreview = await readFileAsDataUrl(file);
      setCertificateForm((current) => ({
        ...current,
        photoName: file.name,
        photoPreview,
      }));
      setAuthFeedback("");
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : "Unable to load the certificate image.");
    } finally {
      event.target.value = "";
    }
  }

  async function refreshRecommendations(profileOverride, aiProfileOverride, options = {}) {
    if (!hasSupabaseConfig) {
      throw new Error("Supabase is not configured for AI recommendations.");
    }

    const profile = profileOverride ?? state.profile;
    const aiProfile = aiProfileOverride ?? state.profile.aiProfile;
    const autoKey = options.autoKey ?? "";

    setState((current) => ({
      ...current,
      aiStatus: {
        ...current.aiStatus,
        refreshingRecommendations: true,
        error: "",
        lastAutoRecommendationKey: autoKey || current.aiStatus.lastAutoRecommendationKey,
      },
    }));

    try {
      const response = await fetchRecommendedJobs({
        profile: {
          fullName: profile.fullName,
          jobTitle: profile.jobTitle,
          location: profile.location,
          about: profile.about,
          skills: profile.skills,
        },
        resumeProfile: aiProfile ?? {},
      });

      setState((current) => ({
        ...current,
        aiRecommendations: response.recommendations ?? [],
        aiStatus: {
          ...current.aiStatus,
          refreshingRecommendations: false,
          updatedAt: getTodayShortDate(),
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        aiStatus: {
          ...current.aiStatus,
          refreshingRecommendations: false,
          error: error instanceof Error ? error.message : "Recommendation failed.",
        },
      }));
      throw error;
    }
  }

  function toggleTheme() {
    setState((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
  }

  function handleAnnouncementAction(slide) {
    setState((current) => ({
      ...current,
      activeSidebar: slide.targetSidebar ?? current.activeSidebar,
      activeCategory: slide.targetCategory ?? current.activeCategory,
      profilePanelOpen: Boolean(slide.openProfile),
      profilePanelTab: slide.openProfile ? "info" : current.profilePanelTab,
    }));
  }

  function openAuthModal(mode = "login") {
    setAuthFeedback("");
    setAuthForm({
      name: mode === "signup" ? state.auth.accountName : "",
      email: mode === "login" || mode === "forgot" ? state.auth.accountEmail : "",
      password: "",
      confirmPassword: "",
      role: mode === "signup" ? state.auth.accountRole ?? "Applicant" : "Applicant",
    });
    setState((current) => ({
      ...current,
      authModalOpen: true,
      authMode: mode,
    }));
  }

  function closeAuthModal() {
    setAuthFeedback("");
    setState((current) => ({
      ...current,
      authModalOpen: false,
    }));
  }

  async function updateAdminCollection(key, itemId, field, value) {
    if (key === "adminCertifications" && field === "status" && hasSupabaseConfig && supabase) {
      const payload = {
        status: value,
        reviewed_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("certificate_submissions")
        .update(payload)
        .eq("id", itemId);

      if (error) {
        setAuthFeedback(error.message || "Unable to update the certificate status.");
        return;
      }
    }

    setState((current) => {
      const nextState = {
        ...current,
        [key]: current[key].map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
      };

      if (key === "adminCertifications" && field === "status") {
        nextState.profileCertificates = current.profileCertificates.map((item) =>
          item.id === itemId ? { ...item, status: value } : item,
        );
      }

      return nextState;
    });

    setAuthFeedback("");
  }

  async function updateAdminUserStatus(userId, nextStatus) {
    const currentStatus = state.adminUsers.find((item) => item.id === userId)?.status ?? "";

    setState((current) => ({
      ...current,
      adminUserActionId: userId,
    }));

    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", userId);

      if (error) {
        setAuthFeedback(error.message || "Unable to update the user status.");
        setState((current) => ({
          ...current,
          adminUserActionId: "",
        }));
        return;
      }

      await loadAdminUsers();
    }

    const feedbackMessage =
      nextStatus === "Suspended"
        ? "User suspended successfully."
        : currentStatus === "Suspended"
          ? "User unsuspended successfully."
          : "User verified successfully.";

    setAuthFeedback(feedbackMessage);
    setState((current) => ({
      ...current,
      adminUserActionId: "",
      adminUsers: current.adminUsers.map((item) =>
        item.id === userId ? { ...item, status: nextStatus } : item,
      ),
    }));
  }

  function applyToJob(jobId) {
    if (!state.auth.isAuthenticated) {
      openAuthModal("signup");
      return;
    }

    setState((current) => ({
      ...current,
      activeSidebar: "applications",
      applicationsTab: "applied",
      expandedApplicationId: jobId,
      selectedJobId: null,
      applications: current.applications.includes(jobId) ? current.applications : [...current.applications, jobId],
      saved: current.saved.filter((id) => id !== jobId),
      applicationStatusById: current.applicationStatusById[jobId]
        ? current.applicationStatusById
        : {
            ...current.applicationStatusById,
            [jobId]: createApplicationEntry(),
          },
    }));
  }

  function toggleSave(jobId) {
    if (!state.auth.isAuthenticated) {
      openAuthModal("login");
      return;
    }

    setState((current) => ({
      ...current,
      saved: current.saved.includes(jobId)
        ? current.saved.filter((id) => id !== jobId)
        : [...current.saved, jobId],
    }));
  }

  function openJobDetails(jobId) {
    setState((current) => ({
      ...current,
      selectedJobId: jobId,
    }));
  }

  function openAdminUserDetails(userId) {
    setState((current) => ({
      ...current,
      selectedAdminUserId: userId,
    }));
  }

  function openAdminCertificationDetails(certificationId) {
    setState((current) => ({
      ...current,
      selectedAdminCertificationId: certificationId,
    }));
  }

  function advanceApplication(jobId) {
    setState((current) => {
      const currentEntry = current.applicationStatusById[jobId] ?? createApplicationEntry();
      const currentIndex = applicationStages.indexOf(currentEntry.status);
      const nextIndex = Math.min(currentIndex + 1, applicationStages.length - 1);
      const stageDates = [...currentEntry.stageDates];

      if (!stageDates[nextIndex]) {
        stageDates[nextIndex] = getTodayShortDate();
      }

      return {
        ...current,
        applicationStatusById: {
          ...current.applicationStatusById,
          [jobId]: {
            ...currentEntry,
            status: applicationStages[nextIndex],
            stageDates,
          },
        },
      };
    });
  }

  function withdrawApplication(jobId) {
    setState((current) => ({
      ...current,
      applications: current.applications.filter((id) => id !== jobId),
      saved: current.saved.includes(jobId) ? current.saved : [...current.saved, jobId],
      expandedApplicationId: current.expandedApplicationId === jobId ? null : current.expandedApplicationId,
    }));
  }

  function toggleRoadmapItem(itemId) {
    setState((current) => ({
      ...current,
      expandedRoadmapId: current.expandedRoadmapId === itemId ? null : itemId,
    }));
  }

  function applyToMentorship(courseId) {
    if (!state.auth.isAuthenticated) {
      openAuthModal("signup");
      return;
    }

    setState((current) => ({
      ...current,
      mentorshipApplied: current.mentorshipApplied.includes(courseId)
        ? current.mentorshipApplied
        : [...current.mentorshipApplied, courseId],
    }));
  }

  function startPracticeExam(certId) {
    setState((current) => ({
      ...current,
      certificationPractice: current.certificationPractice.includes(certId)
        ? current.certificationPractice
        : [...current.certificationPractice, certId],
    }));
  }

  function visitPortal(certId) {
    setState((current) => ({
      ...current,
      certificationPortalVisits: current.certificationPortalVisits.includes(certId)
        ? current.certificationPortalVisits
        : [...current.certificationPortalVisits, certId],
    }));
  }

  function addSkillFromInput(event) {
    if (event.key !== "Enter") return;

    const value = event.currentTarget.value.trim();
    if (!value) return;

    event.preventDefault();

    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        skills: current.profile.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())
          ? current.profile.skills
          : [...current.profile.skills, value],
      },
    }));

    event.currentTarget.value = "";
  }

  function removeSkill(skillToRemove) {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        skills: current.profile.skills.filter((skill) => skill !== skillToRemove),
      },
    }));
  }

  async function handleResumeFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadedAt = getCurrentUploadLabel();
    const profileSnapshot = state.profile;

    setState((current) => ({
      ...current,
      aiStatus: {
        ...current.aiStatus,
        analyzingResume: true,
        error: "",
        lastAutoRecommendationKey: "",
      },
      aiRecommendations: [],
      profile: {
        ...current.profile,
        resumeFileName: file.name,
        resumeUploadedAt: uploadedAt,
        resumeText: "",
        aiProfile: null,
      },
    }));

    try {
      const { extractResumeText } = await import("./lib/resume-text");
      const resumeText = await extractResumeText(file);
      const response = await parseResumeProfile({
        fileName: file.name,
        resumeText,
        profile: profileSnapshot,
      });

      const parsed = response.parsedProfile ?? {};
      const parsedSkills = Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : profileSnapshot.skills;
      const parsedFullName = String(parsed.full_name || "").trim();
      const parsedFirstName = String(parsed.first_name || "").trim();
      const parsedLastName = String(parsed.last_name || "").trim();
      const parsedLocation = Array.isArray(parsed.preferred_locations) && parsed.preferred_locations.length > 0
        ? parsed.preferred_locations[0]
        : profileSnapshot.location;
      const parsedExperienceEntries = Array.isArray(parsed.experience_entries)
        ? parsed.experience_entries
            .filter((item) => item && (item.title || item.company))
            .map((item, index) => ({
              id: Date.now() + index,
              title: item.title || "Resume experience",
              company: item.company || "Resume entry",
              period: item.period || "From uploaded resume",
              years: item.years || "Imported",
            }))
        : [];
      const nextFullName = parsedFullName || profileSnapshot.fullName;
      const nextFirstName = parsedFirstName || nextFullName.split(" ")[0] || profileSnapshot.firstName;
      const nextLastName = parsedLastName || nextFullName.split(" ").slice(1).join(" ") || profileSnapshot.lastName;
      const nextProfile = {
        ...profileSnapshot,
        fullName: nextFullName,
        firstName: nextFirstName,
        lastName: nextLastName,
        jobTitle: parsed.headline || profileSnapshot.jobTitle,
        location: parsedLocation,
        about: parsed.summary || profileSnapshot.about,
        skills: parsedSkills,
        resumeText,
        aiProfile: {
          ...parsed,
          summary: parsed.summary || "The latest resume was analyzed, but the AI summary came back incomplete. Please review your skills and experience details.",
        },
        resumeFileName: file.name,
        resumeUploadedAt: uploadedAt,
      };

      setState((current) => ({
        ...current,
        auth: {
          ...current.auth,
          accountName: nextFullName || current.auth.accountName,
        },
        profile: nextProfile,
        profileExperience: parsedExperienceEntries.length > 0 ? parsedExperienceEntries : current.profileExperience,
        profileSavedAt: `Analyzed ${getTodayShortDate()}`,
        aiStatus: {
          ...current.aiStatus,
          analyzingResume: false,
          error: "",
          updatedAt: getTodayShortDate(),
        },
      }));

      if (hasSupabaseConfig && supabase && state.auth.accountId) {
        await supabase
          .from("profiles")
          .update(createProfileUpdatePayload(nextProfile))
          .eq("id", state.auth.accountId);
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        aiStatus: {
          ...current.aiStatus,
          analyzingResume: false,
          error: error instanceof Error ? error.message : "Resume analysis failed.",
        },
      }));
    } finally {
      event.target.value = "";
    }
  }

  async function saveProfileChanges() {
    const nextFullName = `${state.profile.firstName} ${state.profile.lastName}`.trim() || state.profile.fullName;
    const nextProfile = {
      ...state.profile,
      fullName: nextFullName,
      username: state.profile.username || `@${nextFullName.toLowerCase().replace(/\s+/g, ".")}`,
    };

    if (hasSupabaseConfig && supabase && state.auth.accountId) {
      const { error } = await supabase
        .from("profiles")
        .update(createProfileUpdatePayload(nextProfile))
        .eq("id", state.auth.accountId);

      if (error) {
        setAuthFeedback(error.message || "Unable to save profile changes.");
        return;
      }
    }

    setAuthFeedback("");
    setState((current) => ({
      ...current,
      profileSavedAt: `Saved ${getTodayShortDate()}`,
      profilePanelOpen: false,
      auth: {
        ...current.auth,
        accountName: nextProfile.fullName,
      },
      profile: nextProfile,
    }));
  }

  async function changePasswordFromProfile() {
    if (!passwordForm.password.trim()) {
      setPasswordFeedback("Enter your new password.");
      return;
    }

    if (passwordForm.password.length < 8) {
      setPasswordFeedback("Use at least 8 characters for your new password.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordFeedback("Your new password and confirmation must match.");
      return;
    }

    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.password,
      });

      if (error) {
        setPasswordFeedback(error.message || "Unable to update your password.");
        return;
      }
    }

    setPasswordFeedback("Password updated successfully.");
    setPasswordForm({ password: "", confirmPassword: "" });

    if (!hasSupabaseConfig) {
      setState((current) => ({
        ...current,
        auth: {
          ...current.auth,
          password: passwordForm.password,
        },
      }));
    }
  }

  function addExperienceCard() {
    if (!experienceForm.title.trim() || !experienceForm.company.trim()) {
      setAuthFeedback("Add at least an experience title and organization before saving it.");
      return;
    }

    const experienceEntry = {
      id: Date.now(),
      title: experienceForm.title.trim(),
      company: experienceForm.company.trim(),
      years: experienceForm.years.trim() || "In progress",
      period: experienceForm.period.trim() || "Date not specified",
    };

    setState((current) => ({
      ...current,
      profileExperience: [...current.profileExperience, experienceEntry],
    }));

    setAuthFeedback("");
    setExperienceForm({ title: "", company: "", period: "", years: "" });
  }

  async function addCertificateCard() {
    if (!certificateForm.title.trim() || !certificateForm.source.trim()) {
      setAuthFeedback("Add the certificate title and provider before submitting it for review.");
      return;
    }

    if (!certificateForm.photoPreview) {
      setAuthFeedback("Upload a certificate photo before submitting it for review.");
      return;
    }

    if (hasSupabaseConfig && supabase && state.auth.accountId) {
      const insertPayload = {
        applicant_id: state.auth.accountId,
        title: certificateForm.title.trim(),
        provider: certificateForm.source.trim(),
        issue_date_label: certificateForm.date.trim() || null,
        status: "Pending",
        proof_file_name: certificateForm.photoName,
        proof_image_data_url: certificateForm.photoPreview,
        uploaded_by_name: state.profile.fullName,
        uploaded_by_email: state.profile.email,
        uploaded_by_role: state.profile.role,
        uploaded_by_title: state.profile.jobTitle,
        uploaded_by_location: state.profile.location,
      };

      const { data, error } = await supabase
        .from("certificate_submissions")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) {
        setAuthFeedback(error.message || "Unable to submit the certificate for admin review.");
        return;
      }

      const certificateEntry = mapCertificateSubmissionRecord(data);

      setState((current) => ({
        ...current,
        profileCertificates: [certificateEntry, ...current.profileCertificates.filter((item) => item.id !== certificateEntry.id)],
      }));

      setAuthFeedback("");
      setCertificateForm({ title: "", source: "", date: "", photoName: "", photoPreview: "" });
      return;
    }

    const certificateEntry = {
      id: Date.now(),
      title: certificateForm.title.trim(),
      source: certificateForm.source.trim(),
      date: certificateForm.date.trim() || `Submitted ${getTodayLongDate()}`,
      status: "Pending",
      photoName: certificateForm.photoName,
      photoPreview: certificateForm.photoPreview,
      uploadedByName: state.profile.fullName,
      uploadedByEmail: state.profile.email,
      uploadedByRole: state.profile.role,
      uploadedByTitle: state.profile.jobTitle,
      uploadedByLocation: state.profile.location,
      uploadedAt: getTodayLongDate(),
    };

    setState((current) => ({
      ...current,
      profileCertificates: [...current.profileCertificates, certificateEntry],
      adminCertifications: [
        {
          id: certificateEntry.id,
          title: certificateEntry.title,
          provider: certificateEntry.source,
          status: "Pending",
          photoName: certificateEntry.photoName,
          photoPreview: certificateEntry.photoPreview,
          uploadedByName: certificateEntry.uploadedByName,
          uploadedByEmail: certificateEntry.uploadedByEmail,
          uploadedByRole: certificateEntry.uploadedByRole,
          uploadedByTitle: certificateEntry.uploadedByTitle,
          uploadedByLocation: certificateEntry.uploadedByLocation,
          uploadedAt: certificateEntry.uploadedAt,
          submittedDate: certificateEntry.date,
        },
        ...current.adminCertifications,
      ],
    }));

    setAuthFeedback("");
    setCertificateForm({ title: "", source: "", date: "", photoName: "", photoPreview: "" });
  }

  function addVolunteerCard() {
    if (!volunteerForm.org.trim() || !volunteerForm.role.trim()) {
      setAuthFeedback("Add the organization and your volunteer role before saving it.");
      return;
    }

    const volunteerEntry = {
      id: Date.now(),
      org: volunteerForm.org.trim(),
      role: volunteerForm.role.trim(),
      status: volunteerForm.status,
      last: volunteerForm.last.trim() || `Last activity: ${getTodayLongDate()}`,
    };

    setState((current) => ({
      ...current,
      volunteerActivities: [...current.volunteerActivities, volunteerEntry],
    }));

    setAuthFeedback("");
    setVolunteerForm({ org: "", role: "", status: "Active", last: "" });
  }

  function importLinkedInProfile() {
    if (!state.profile.linkedIn.trim()) return;

    const normalized = state.profile.linkedIn.startsWith("http")
      ? state.profile.linkedIn
      : `https://${state.profile.linkedIn}`;

    setState((current) => ({
      ...current,
      profileSavedAt: `Imported ${getTodayShortDate()}`,
      profile: {
        ...current.profile,
        linkedIn: normalized,
        portfolio: current.profile.portfolio || normalized,
      },
    }));
  }

  function getRelevantSkills(listing) {
    return filterSpecificMatchedSkills(getApplicantMatchedSkills(getApplicantSkills(state.profile), listing.requiredSkills));
  }

  async function submitAuth(event) {
    event.preventDefault();

    if (state.authMode === "forgot") {
      if (!authForm.email.trim()) {
        setAuthFeedback("Enter your email so we can send a password reset link.");
        return;
      }

      if (hasSupabaseConfig && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(authForm.email.trim(), {
          redirectTo: window.location.origin,
        });

        if (error) {
          setAuthFeedback(error.message || "Unable to send the password reset email.");
          return;
        }

        setAuthFeedback("Password reset email sent. Open the link in your email to set a new password.");
        return;
      }

      setAuthFeedback("Password reset requires Supabase to be configured.");
      return;
    }

    if (state.authMode === "reset") {
      if (!authForm.password.trim()) {
        setAuthFeedback("Enter your new password.");
        return;
      }

      if (authForm.password !== authForm.confirmPassword) {
        setAuthFeedback("Your new password and confirmation must match.");
        return;
      }

      if (hasSupabaseConfig && supabase) {
        const { error } = await supabase.auth.updateUser({
          password: authForm.password,
        });

        if (error) {
          setAuthFeedback(error.message || "Unable to update your password.");
          return;
        }

        setAuthFeedback("");
        setState((current) => ({
          ...current,
          authModalOpen: false,
          authMode: "login",
        }));
        return;
      }

      setAuthFeedback("Password reset requires Supabase to be configured.");
      return;
    }

    if (state.authMode === "login") {
      if (!authForm.email.trim() || !authForm.password.trim()) {
        setAuthFeedback("Enter your email and password to log in.");
        return;
      }

      if (hasSupabaseConfig && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });

        if (error) {
          setAuthFeedback(error.message || "Unable to log in with that account.");
          return;
        }

        const userId = data.user?.id ?? data.session?.user?.id;

        if (userId) {
          const { data: profileRecord, error: profileError } = await supabase
            .from("profiles")
            .select("status, email")
            .eq("id", userId)
            .maybeSingle();

          if (profileError) {
            await supabase.auth.signOut();
            setAuthFeedback(profileError.message || "Unable to verify your account status.");
            return;
          }

          if (profileRecord?.status === "Suspended") {
            await supabase.auth.signOut();
            setAuthFeedback("This account has been suspended. Please contact support or an administrator for assistance.");
            return;
          }
        }

        setAuthFeedback("");
        return;
      }

      return;
    }

    if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password.trim()) {
      setAuthFeedback("Complete your name, email, password, and role to create an account.");
      return;
    }

    const fullName = authForm.name.trim();
    const nameParts = fullName.split(" ").filter(Boolean);
    const firstName = nameParts[0] || "Applicant";
    const lastName = nameParts.slice(1).join(" ") || "User";
    const username = `@${fullName.toLowerCase().replace(/\s+/g, ".")}`;
    const role = authForm.role || "Applicant";

    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.functions.invoke("register-user", {
        body: {
          email: authForm.email.trim(),
          password: authForm.password,
          fullName,
          firstName,
          lastName,
          role,
        },
      });

      if (error) {
        setAuthFeedback(error.message || "Unable to create your account.");
        return;
      }

      if (data?.error) {
        setAuthFeedback(data.error || "Unable to create your account.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authForm.email.trim(),
        password: authForm.password,
      });

      if (signInError) {
        setAuthFeedback(signInError.message || "Account created, but automatic login failed.");
        return;
      }

      setAuthFeedback("");
      return;
    }

    setState((current) => ({
      ...current,
      authModalOpen: false,
      activeSidebar: role === "Admin" ? "analytics" : "discover",
      auth: {
        isAuthenticated: true,
        accountId: "",
        accountName: fullName,
        accountEmail: authForm.email.trim(),
        accountRole: role,
        password: authForm.password,
      },
      profile: {
        ...createBaseUserProfile(role),
        fullName,
        username,
        email: authForm.email.trim(),
        firstName,
        lastName,
        role,
      },
      profileSavedAt: `Created ${getTodayShortDate()}`,
  }));
    setAuthFeedback("");
  }

  async function logoutUser() {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    }

    setAuthFeedback("");
    setIsRenewalNoticeDismissed(false);
    setState((current) => ({
      ...current,
      authModalOpen: false,
      profilePanelOpen: false,
      authMode: "login",
      activeSidebar: "discover",
      auth: {
        ...current.auth,
        isAuthenticated: false,
        accountId: "",
        accountName: "",
        accountEmail: "",
        accountRole: "Applicant",
        password: "",
      },
      subscription: {
        status: "free",
        plan: "Free",
        renewalDate: "",
      },
      profile: guestProfile,
      profileCertificates: [],
      adminCertifications: [],
    }));
  }

  async function activateApplicantSubscription() {
   if (isAdmin) return;

   if (!state.auth.isAuthenticated) {
     openAuthModal("signup");
     return;
   }

   if (!hasSupabaseConfig || !supabase) {
     alert("Supabase is not configured.");
     return;
   }

   const { data, error } = await supabase.rpc("activate_my_subscription");

   if (error) {
     console.error("Subscription RPC error:", error);
     alert(`Subscription could not be saved.\n\n${error.message}`);
      return;
   }

    const subscription = Array.isArray(data) ? data[0] : data;

    if (!subscription) {
     alert("Subscription could not be saved. No subscription data was returned.");
     return;
   }

   patchState({
     subscription: {
       status: subscription.status,
       plan: subscription.plan,
        renewalDate: subscription.renewal_date,
     },
   });

    setIsRenewalNoticeDismissed(false);
    alert("Subscription activated and saved successfully.");
  }

  function PremiumLockScreen({ pageName, onSubscribe }) {
    return (
      <section className="premium-lock-section">
        <div className="premium-lock-card">
          <div className="premium-lock-icon">
            <ShieldCheck size={30} />
          </div>
          <span className="section-kicker">Premium feature</span>
          <h1>{pageName} is for subscribed applicants</h1>
          <p>
            You can still browse and apply for jobs for free. Subscribe to SkillBridge Premium to unlock mentorship,
            personalized roadmaps, progress tracking, and certification resources.
          </p>
          <div className="premium-benefits">
            <span>✔ Personalized career roadmap</span>
            <span>✔ Mentor-led learning support</span>
            <span>✔ Certification preparation resources</span>
            <span>✔ Progress and skill tracking</span>
          </div>
          <button className="profile-primary-button" type="button" onClick={onSubscribe}>
            Subscribe Now
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className={`dashboard-shell theme-${state.theme}${isAdmin ? " role-admin" : ""}`}>
      <aside className="dashboard-sidebar">
        <div>
          <div className="sidebar-brand">
            <img src="/skillbridge-logo.png" alt="SkillBridge" className="sidebar-brand-logo" />
          </div>

          <nav className="sidebar-nav">
            {currentSidebarItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sidebar-link${state.activeSidebar === id ? " active" : ""}`}
                type="button"
                onClick={() => patchState({ activeSidebar: id })}
              >
                <Icon size={17} />
                <span>{label}</span>
                {!isAdmin && premiumApplicantPages.includes(id) && !hasActiveSubscription && <span className="premium-lock">Premium</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {!isAdmin && !hasActiveSubscription && (
            <div className="sidebar-subscription-card">
              <span className="sidebar-subscription-kicker">Premium Access</span>
              <h3>Unlock SkillBridge</h3>
              <p>Unlock premium career tools.</p>
              <button
                className="sidebar-subscription-button"
                type="button"
                onClick={() => patchState({ activeSidebar: "subscription" })}
              >
                Subscribe Now
              </button>
            </div>
          )}

          <button className="light-toggle" type="button" onClick={toggleTheme}>
            <MoonStar size={16} />
            <span>{state.theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            className="sidebar-profile profile-trigger"
            type="button"
            onClick={() => (state.auth.isAuthenticated ? patchState({ profilePanelOpen: true }) : openAuthModal("login"))}
          >
            <div className="sidebar-avatar">
              {state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt={`${state.profile.fullName} avatar`} className="sidebar-avatar-image" /> : profileInitials}
            </div>
            <div>
              <strong>{state.profile.fullName}</strong>
              <span>{state.profile.role}</span>
            </div>
            <BadgeCheck size={15} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        {!isAdmin && showRenewalNotice && (
          <div
            className="subscription-renewal-alert"
            role="button"
            tabIndex={0}
            title="Click to dismiss"
            onClick={() => setIsRenewalNoticeDismissed(true)}
            onKeyDown={(event) => {
              if (["Enter", " ", "Escape"].includes(event.key)) {
                event.preventDefault();
                setIsRenewalNoticeDismissed(true);
              }
            }}
          >
            <button
              className="subscription-renewal-close"
              type="button"
              aria-label="Dismiss subscription renewal reminder"
              onClick={() => setIsRenewalNoticeDismissed(true)}
            >
              ×
            </button>
            <strong>Subscription renewal reminder</strong>
            <p>
              Your {state.subscription.plan} subscription will renew {daysBeforeRenewal === 0 ? "today" : `in ${daysBeforeRenewal} day${daysBeforeRenewal > 1 ? "s" : ""}`}.
            </p>
          </div>
        )}

        {!state.auth.isAuthenticated && state.activeSidebar === "discover" && (
          <div className="dashboard-toolbar">
            <button className="auth-entry-button" type="button" onClick={() => openAuthModal("signup")}>
              Login / Sign Up
            </button>
          </div>
        )}

        {!isAdmin && state.activeSidebar === "subscription" && (
          <section className="subscription-page">
            <div className="subscription-hero-card">
              <span className="section-kicker">SkillBridge Premium</span>
              <h1>Upgrade your career journey</h1>
              <p>
                Subscribe to unlock mentorship, personalized roadmaps, progress tracking, and certification tools built for
                applicants, interns, and fresh graduates.
              </p>

              <div className="subscription-plan-card">
                <div>
                  <span className="subscription-plan-label">Applicant Premium</span>
                  <h2>₱199/month</h2>
                  <p>Includes a 30-day subscription period for premium applicant features.</p>
                </div>

                <button
                  className="profile-primary-button"
                  type="button"
                  onClick={activateApplicantSubscription}
                >
                  {hasActiveSubscription ? "Subscription Active" : "Continue to Subscribe"}
                </button>
              </div>

              <div className="subscription-benefits-grid">
                <div>
                  <strong>Mentorship Access</strong>
                  <p>Connect with mentors and professors for guided learning.</p>
                </div>
                <div>
                  <strong>Career Roadmap</strong>
                  <p>See what skills you need for your target job role.</p>
                </div>
                <div>
                  <strong>Progress Tracking</strong>
                  <p>Track completed skills, courses, and learning progress.</p>
                </div>
                <div>
                  <strong>Certifications</strong>
                  <p>Access certification recommendations and submission tools.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {isAdmin && state.activeSidebar === "analytics" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <LineChart size={18} />
              </div>
              <div>
                <h1>Analytics</h1>
                <p>Platform metrics and insights</p>
              </div>
            </div>

            <div className="summary-grid admin-summary-grid">
              <article className="summary-card">
                <span>Total Users</span>
                <strong>48,234</strong>
              </article>
              <article className="summary-card">
                <span>Active Users</span>
                <strong>32,156</strong>
              </article>
              <article className="summary-card">
                <span>Total Revenue</span>
                <strong>$513,500</strong>
              </article>
              <article className="summary-card">
                <span>Active Courses</span>
                <strong>24</strong>
              </article>
            </div>

            <article className="progress-card">
              <h3>Platform Metrics</h3>
              <div className="admin-metric-grid">
                <div>
                  <span>New Users (30d)</span>
                  <strong>2,341</strong>
                </div>
                <div>
                  <span>Pending Approvals</span>
                  <strong>15</strong>
                </div>
                <div>
                  <span>Avg Session Time</span>
                  <strong>23m 45s</strong>
                </div>
                <div>
                  <span>Conversion Rate</span>
                  <strong>3.4%</strong>
                </div>
              </div>
            </article>

            <article className="progress-card">
              <h3>Revenue Trend (Last 5 Months)</h3>
              <div className="admin-trend-list">
                {[
                  { month: "Jan", value: "$85,000", width: "72%" },
                  { month: "Feb", value: "$92,500", width: "78%" },
                  { month: "Mar", value: "$104,000", width: "88%" },
                  { month: "Apr", value: "$112,000", width: "94%" },
                  { month: "May", value: "$120,000", width: "100%" },
                ].map((item) => (
                  <div key={item.month} className="admin-trend-row">
                    <span>{item.month}</span>
                    <div className="admin-trend-bar">
                      <div style={{ width: item.width }} />
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {isAdmin && state.activeSidebar === "users" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <Users size={18} />
              </div>
              <div>
                <h1>Users</h1>
                <p>Manage platform users</p>
              </div>
            </div>

            <label className="listing-search" htmlFor="admin-user-search">
              <Search size={17} />
              <input
                id="admin-user-search"
                value={adminUserSearchQuery}
                onChange={(event) => setAdminUserSearchQuery(event.target.value)}
                placeholder="Search users by name, email, role, or title..."
              />
            </label>

            <div className="progress-card-list">
              {filteredAdminUsers.map((item) => (
                <article key={item.id} className="progress-card interactive-card" onClick={() => openAdminUserDetails(item.id)}>
                  <div className="application-top">
                    <div className="listing-avatar violet">{item.name.slice(0, 1)}</div>
                    <div className="application-copy">
                      <h3>{item.name}</h3>
                      <p>{item.title || item.role}</p>
                      <span>Joined {item.joined}</span>
                    </div>
                    <span className={`status-badge ${getAdminStatusClass(item.status)}`}>{formatAdminUserStatus(item.status)}</span>
                  </div>
                  <div className="application-actions">
                    {item.status !== "Active" ? (
                      <button
                        className="ghost-action"
                        type="button"
                        disabled={state.adminUserActionId === item.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateAdminUserStatus(item.id, "Active");
                        }}
                      >
                        {state.adminUserActionId === item.id ? "Updating..." : "Verify"}
                      </button>
                    ) : null}
                    <button
                      className="ghost-action"
                      type="button"
                      disabled={state.adminUserActionId === item.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateAdminUserStatus(item.id, item.status === "Suspended" ? "Active" : "Suspended");
                      }}
                    >
                      {state.adminUserActionId === item.id
                        ? "Updating..."
                        : item.status === "Suspended"
                          ? "Unsuspend"
                          : "Suspend"}
                    </button>
                  </div>
                </article>
              ))}
              {registeredAdminUsers.length === 0 ? (
                <div className="empty-feed">
                  <h3>No registered users to review</h3>
                  <p>Verified and suspended user accounts will appear here for admin action.</p>
                </div>
              ) : filteredAdminUsers.length === 0 ? (
                <div className="empty-feed">
                  <h3>No users matched your search</h3>
                  <p>Try a different name, email, role, title, or location.</p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {isAdmin && state.activeSidebar === "courses" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <BookOpen size={18} />
              </div>
              <div>
                <h1>Courses</h1>
                <p>Track and manage course publishing</p>
              </div>
            </div>

            <div className="progress-card-list">
              {state.adminCourses.map((item) => (
                <article key={item.id} className="progress-card">
                  <div className="application-top">
                    <div className="listing-avatar mint">{item.title.slice(0, 1)}</div>
                    <div className="application-copy">
                      <h3>{item.title}</h3>
                      <p>{item.owner}</p>
                      <span>Course pipeline management</span>
                    </div>
                    <span className={`status-badge ${item.status === "Published" ? "ready" : item.status === "Review" ? "reviewed" : "saved"}`}>{item.status}</span>
                  </div>
                  <div className="application-actions">
                    <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminCourses", item.id, "status", "Published")}>
                      Publish
                    </button>
                    <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminCourses", item.id, "status", "Review")}>
                      Review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {isAdmin && state.activeSidebar === "certifications-admin" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1>Certifications</h1>
                <p>Review certification approvals</p>
              </div>
            </div>

            <div className="progress-card-list">
              {state.adminCertifications.map((item) => (
                <article key={item.id} className="progress-card interactive-card" onClick={() => openAdminCertificationDetails(item.id)}>
                  <div className="application-top">
                    <div className="cert-provider">{item.provider}</div>
                    <div className="application-copy">
                      <h3>{item.title}</h3>
                      <p>{item.uploadedByName || "Unknown uploader"}</p>
                      <span>{item.photoName ? `Proof attached: ${item.photoName}` : "Awaiting certificate proof"}</span>
                    </div>
                    <span className={`status-badge ${item.status === "Approved" ? "ready" : item.status === "Rejected" ? "saved" : "reviewed"}`}>{item.status}</span>
                  </div>
                  {item.photoPreview ? (
                    <div className="certificate-proof-block">
                      <img src={item.photoPreview} alt={`${item.title} certificate proof`} className="certificate-proof-image" />
                      <a className="auth-inline-link" href={item.photoPreview} target="_blank" rel="noreferrer">
                        Open proof image
                      </a>
                    </div>
                  ) : null}
                  <div className="application-actions">
                    <button
                      className="ghost-action"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateAdminCollection("adminCertifications", item.id, "status", "Approved");
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="ghost-action"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateAdminCollection("adminCertifications", item.id, "status", "Rejected");
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
              {state.adminCertifications.length === 0 ? (
                <div className="empty-feed">
                  <h3>No certificate submissions yet</h3>
                  <p>User-uploaded certificate proofs will appear here for admin review.</p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {isAdmin && state.activeSidebar === "mentors" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <BadgeCheck size={18} />
              </div>
              <div>
                <h1>Mentors</h1>
                <p>Verify and manage mentors</p>
              </div>
            </div>

            <div className="progress-card-list">
              {state.adminMentors.map((item) => (
                <article key={item.id} className="progress-card">
                  <div className="application-top">
                    <div className="listing-avatar violet">{item.name.slice(0, 1)}</div>
                    <div className="application-copy">
                      <h3>{item.name}</h3>
                      <p>{item.specialty}</p>
                      <span>Mentor onboarding workflow</span>
                    </div>
                    <span className={`status-badge ${item.status === "Verified" ? "ready" : item.status === "Needs Review" ? "saved" : "reviewed"}`}>{item.status}</span>
                  </div>
                  <div className="application-actions">
                    <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminMentors", item.id, "status", "Verified")}>
                      Verify
                    </button>
                    <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminMentors", item.id, "status", "Needs Review")}>
                      Review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {isAdmin && state.activeSidebar === "employers" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <BriefcaseBusiness size={18} />
              </div>
              <div>
                <h1>Employers</h1>
                <p>Verify and manage employers</p>
              </div>
            </div>

            <p className="listing-caption">{state.adminEmployers.filter((item) => item.status === "Pending").length} pending verifications</p>

            <div className="progress-card-list">
              {state.adminEmployers.map((item) => (
                <article key={item.id} className="progress-card">
                  <div className="application-top">
                    <div className="listing-avatar mint">{item.company.slice(0, 1)}</div>
                    <div className="application-copy">
                      <h3>{item.company}</h3>
                      <p>{item.industry}</p>
                      <span>Employer trust and onboarding</span>
                    </div>
                    <span className={`status-badge ${item.status === "Verified" ? "ready" : item.status === "Rejected" ? "saved" : "reviewed"}`}>{item.status}</span>
                  </div>
                  {item.status === "Pending" && (
                    <div className="application-actions">
                      <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminEmployers", item.id, "status", "Verified")}>
                        Approve
                      </button>
                      <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminEmployers", item.id, "status", "Rejected")}>
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {isAdmin && state.activeSidebar === "revenue" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <DollarSign size={18} />
              </div>
              <div>
                <h1>Revenue</h1>
                <p>Financial overview and transactions</p>
              </div>
            </div>

            <div className="summary-grid admin-summary-grid">
              <article className="summary-card">
                <span>This Month</span>
                <strong>$120k</strong>
              </article>
              <article className="summary-card">
                <span>Avg per User</span>
                <strong>$3.73</strong>
              </article>
              <article className="summary-card">
                <span>YTD Revenue</span>
                <strong>$513k</strong>
              </article>
              <article className="summary-card">
                <span>Pending Payments</span>
                <strong>1</strong>
              </article>
            </div>

            <div className="admin-two-column">
              <article className="progress-card">
                <h3>Revenue by Source</h3>
                <div className="admin-trend-list">
                  {[
                    { label: "Subscriptions", value: "$58,000", width: "48%", accent: "violet" },
                    { label: "Course Sales", value: "$48,000", width: "38%", accent: "mint" },
                    { label: "Certifications", value: "$14,000", width: "12%", accent: "gold" },
                  ].map((item) => (
                    <div key={item.label} className="admin-source-row">
                      <div className="application-subrow">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                      <div className="assessment-bar">
                        <span style={{ width: item.width }} className={item.accent} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="progress-card">
                <h3>Payment Methods</h3>
                <div className="admin-trend-list">
                  {[
                    { label: "Credit Card", value: "5 transactions", width: "62%", accent: "violet" },
                    { label: "PayPal", value: "2 transactions", width: "26%", accent: "mint" },
                    { label: "Bank Transfer", value: "1 transactions", width: "14%", accent: "gold" },
                  ].map((item) => (
                    <div key={item.label} className="admin-source-row">
                      <div className="application-subrow">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                      <div className="assessment-bar">
                        <span style={{ width: item.width }} className={item.accent} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="progress-card">
              <h3>Recent Transactions</h3>
              <div className="progress-card-list">
                {state.adminRevenue.map((item) => (
                  <div key={item.id} className="profile-mini-card">
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.amount}</p>
                    </div>
                    <span className={`status-badge ${item.status === "Collected" ? "ready" : "reviewed"}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {isAdmin && state.activeSidebar === "cms" && (
          <section className="applications-section">
            <div className="admin-page-hero">
              <div className="admin-page-icon">
                <MapIcon size={18} />
              </div>
              <div>
                <h1>Content Management</h1>
                <p>Manage platform content</p>
              </div>
            </div>

            <div className="summary-grid cms-grid">
              <article className="summary-card">
                <div className="listing-avatar violet">J</div>
                <strong>Job Listings</strong>
                <span>11 items</span>
              </article>
              <article className="summary-card">
                <div className="listing-avatar violet">M</div>
                <strong>Mentor Courses</strong>
                <span>4 items</span>
              </article>
              <article className="summary-card">
                <div className="listing-avatar violet">C</div>
                <strong>Certifications</strong>
                <span>6 items</span>
              </article>
              <article className="summary-card">
                <div className="listing-avatar violet">A</div>
                <strong>Announcements</strong>
                <span>3 items</span>
              </article>
            </div>

            <article className="progress-card">
              <h3>Recent Content Updates</h3>
              <div className="progress-card-list">
                {state.adminContent.map((item) => (
                  <div key={item.id} className="profile-mini-card">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.status}</p>
                    </div>
                    <button className="ghost-action" type="button" onClick={() => updateAdminCollection("adminContent", item.id, "status", "Published")}>
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "discover" && (
          <>
            <section className="announcement-section">
              <div className="section-label">
                <ShieldCheck size={13} />
                <span>Announcements</span>
                <strong>{announcementSlides.length}</strong>
              </div>

              <article className="announcement-card">
                <div className="announcement-icon">
                  <ShieldCheck size={15} />
                </div>
                <div className="announcement-content">
                  <div className="announcement-pills">
                    <span>{announcementSlides[activeAnnouncement].tag}</span>
                    <span>{announcementSlides[activeAnnouncement].label}</span>
                  </div>
                  <h2>{announcementSlides[activeAnnouncement].title}</h2>
                  <p>{announcementSlides[activeAnnouncement].body}</p>
                  <button className="announcement-link" type="button" onClick={() => handleAnnouncementAction(announcementSlides[activeAnnouncement])}>
                    {announcementSlides[activeAnnouncement].link}
                    <ArrowRight size={13} />
                  </button>
                </div>
                <time>{announcementSlides[activeAnnouncement].date}</time>
              </article>

              <div className="announcement-carousel">
                {announcementSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    className={`carousel-pill${index === activeAnnouncement ? " active" : ""}`}
                    type="button"
                    aria-label={`Show announcement ${index + 1}`}
                    onClick={() => setActiveAnnouncement(index)}
                  />
                ))}
              </div>
            </section>

            <section className="discover-section">
              <article className="ai-studio-card">
                <div className="ai-studio-head">
                  <div>
                    <span className="section-kicker">AI MATCH STUDIO</span>
                    <h3>Resume-aware job ranking</h3>
                    <p>
                      Upload your resume once, then let Gemini act as the judge while the live similarity engine scores every job in the database based on your skills, role fit, and the gaps worth improving.
                    </p>
                  </div>
                  <button
                    className="profile-primary-button small ai-refresh-button"
                    type="button"
                    onClick={() => refreshRecommendations().catch(() => {})}
                    disabled={state.aiStatus.refreshingRecommendations || state.aiStatus.analyzingResume || !state.profile.aiProfile}
                  >
                    {state.aiStatus.refreshingRecommendations ? "Refreshing..." : "Refresh AI Matches"}
                  </button>
                </div>

                <div className="ai-studio-status">
                  <span>{hasSupabaseConfig ? "Live Supabase connected" : "Supabase not configured"}</span>
                  <span>{state.liveJobs.length} live jobs loaded</span>
                  <span>{rankedListings.length} ranked roles</span>
                  <span>{state.aiStatus.updatedAt ? `Updated ${state.aiStatus.updatedAt}` : "Awaiting resume analysis"}</span>
                </div>

                {state.aiStatus.error && <p className="ai-error-message">{state.aiStatus.error}</p>}

                {topRecommendations.length > 0 ? (
                  <div className="ai-recommendation-row">
                    {topRecommendations.map((item) => (
                      <button
                        key={item.id}
                        className="ai-recommendation-pill"
                        type="button"
                        onClick={() => openJobDetails(item.id)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.company}</span>
                        <em>{item.score} match</em>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="ai-empty-note">Upload a resume from your profile panel to rank all live jobs by similarity and surface clearer skill-gap reasons.</p>
                )}
              </article>

              <label className="listing-search" htmlFor="listing-search">
                <Search size={17} />
                <input
                  id="listing-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search jobs, companies, locations..."
                />
              </label>

              <div className="category-bar">
                {counts.map(({ id, label, count, icon: Icon }) => (
                  <button
                    key={id}
                    className={`category-chip${state.activeCategory === id ? " active" : ""}`}
                    type="button"
                    onClick={() => patchState({ activeCategory: id })}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </button>
                ))}
              </div>

              <p className="listing-caption">LIVE MATCHES | apply in one click or save roles for later review</p>

              <div className="listing-stack">
                {filteredListings.map((listing) => {
                  const isApplied = state.applications.includes(listing.id);
                  const isSaved = state.saved.includes(listing.id);

                  return (
                    <article key={listing.id} className="listing-card interactive-card" onClick={() => openJobDetails(listing.id)}>
                      <div className="listing-top">
                        <div className={`listing-avatar ${listing.accent}`}>{listing.initial}</div>
                        <div className="listing-copy">
                          <h3>{listing.title}</h3>
                          <p>{listing.company}</p>
                          <span>{listing.meta}</span>
                        </div>
                        <div className={`listing-score ${listing.scoreTone}`}>{listing.score}</div>
                      </div>

                      <div className="listing-meta-row">
                        <span>Posted {listing.posted}</span>
                        <span>{listing.applicants} applicants</span>
                        <span className="danger">{listing.gaps.length} skill gaps</span>
                      </div>

                      {listing.aiReason && <p className="listing-ai-reason">{listing.aiReason}</p>}

                      <div className="listing-actions">
                        <button
                          className={`apply-action${isApplied ? " applied" : ""}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            applyToJob(listing.id);
                          }}
                        >
                          <ArrowRight size={14} />
                          {isApplied ? "Application Sent" : "Apply Now"}
                        </button>
                        <button
                          className={`save-action${isSaved ? " saved" : ""}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSave(listing.id);
                          }}
                          aria-label="Save job"
                        >
                          <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {filteredListings.length === 0 && (
                  <div className="empty-feed">
                    <h3>{rankedListings.length === 0 ? "No live jobs available yet" : "No matches yet for that search"}</h3>
                    <p>
                      {rankedListings.length === 0
                        ? "Once live jobs are available in the database, SkillBridge will rank them here by similarity percentage."
                        : "Try another job title, company, location, or skill to broaden your results."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {!isAdmin && state.activeSidebar === "applications" && (
          <section className="applications-section">
            <div className="applications-head">
              <div>
                <h1>Applications</h1>
                <p>Track every application in one place.</p>
              </div>
              <button className="add-button" type="button" onClick={() => patchState({ activeSidebar: "discover" })}>
                <Plus size={14} />
                Add
              </button>
            </div>

            <div className="applications-tabs">
              <button className={`applications-tab${state.applicationsTab === "applied" ? " active" : ""}`} type="button" onClick={() => patchState({ applicationsTab: "applied" })}>
                <BriefcaseBusiness size={14} />
                <span>Applied</span>
                <strong>{appliedCount}</strong>
              </button>
              <button className={`applications-tab${state.applicationsTab === "saved" ? " active" : ""}`} type="button" onClick={() => patchState({ applicationsTab: "saved" })}>
                <Heart size={14} />
                <span>Saved</span>
                <strong>{savedCards.length}</strong>
              </button>
            </div>

            <div className="summary-grid">
              <article className="summary-card">
                <strong>{appliedCount}</strong>
                <span>Applied</span>
              </article>
              <article className="summary-card">
                <strong className="violet-text">{inProgressCount}</strong>
                <span>In Progress</span>
              </article>
              <article className="summary-card">
                <strong className="mint-text">{interviewCount}</strong>
                <span>Interviews</span>
              </article>
            </div>

            <div className="application-list">
              {state.applicationsTab === "applied" &&
                activeApplicationCards.map((card) => {
                  const expanded = state.expandedApplicationId === card.id;
                  const activeIndex = applicationStages.indexOf(card.status);

                  return (
                    <article key={card.id} className={`application-card interactive-card${expanded ? " expanded" : ""}`} onClick={() => patchState({ expandedApplicationId: expanded ? null : card.id })}>
                      <div className="application-top">
                        <div className={`listing-avatar ${card.accent}`}>{card.initial}</div>
                        <div className="application-copy">
                          <div className="application-title-row">
                            <h3>{card.title}</h3>
                            <span className={`status-badge ${card.status.toLowerCase()}`}>{card.status}</span>
                          </div>
                          <p>{card.company}</p>
                          <span>{card.appliedDate}</span>
                        </div>
                        <div className="application-side">
                          <div className={`listing-score ${getScoreToneClass(card.score)}`}>{card.score}</div>
                          <button
                            className="expand-button"
                            type="button"
                            aria-label="Toggle application details"
                            onClick={(event) => {
                              event.stopPropagation();
                              patchState({ expandedApplicationId: expanded ? null : card.id });
                            }}
                          >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="application-details">
                          <div className="application-subrow">
                            <span>{card.meta.split("|").at(-1)?.trim()}</span>
                            <span>Applied {card.appliedDate}</span>
                          </div>

                          <div className="stage-row">
                            {applicationStages.map((stage, index) => (
                              <div key={stage} className="stage-item-wrap">
                                <div className={`stage-item${index <= activeIndex ? " active" : ""}`}>
                                  <div className="stage-dot">{index <= activeIndex ? <BadgeCheck size={11} /> : null}</div>
                                  <strong>{stage}</strong>
                                  <span>{card.stageDates[index]}</span>
                                </div>
                                {index < applicationStages.length - 1 && <div className={`stage-line${index < activeIndex ? " active" : ""}`} />}
                              </div>
                            ))}
                          </div>

                          <div className="application-actions">
                            <button
                              className="ghost-action"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                advanceApplication(card.id);
                              }}
                            >
                              Move to Next Stage
                            </button>
                            <button
                              className="ghost-action"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                withdrawApplication(card.id);
                              }}
                            >
                              Withdraw
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

              {state.applicationsTab === "saved" &&
                activeApplicationCards.map((card) => (
                  <article key={card.id} className="application-card compact interactive-card" onClick={() => openJobDetails(card.id)}>
                    <div className="application-top">
                      <div className={`listing-avatar ${card.accent}`}>{card.initial}</div>
                      <div className="application-copy">
                        <div className="application-title-row">
                          <h3>{card.title}</h3>
                          <span className="status-badge saved">Saved</span>
                        </div>
                        <p>{card.company}</p>
                        <span>{card.posted}</span>
                      </div>
                      <div className="application-side">
                        <div className={`listing-score ${getScoreToneClass(card.score)}`}>{card.score}</div>
                      </div>
                    </div>
                  </article>
                ))}

              {activeApplicationCards.length === 0 && (
                <div className="empty-feed">
                  <h3>No {state.applicationsTab} roles yet</h3>
                  <p>{state.applicationsTab === "applied" ? "Apply from Discover to start tracking your applications here." : "Save roles from Discover to compare opportunities later."}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "progress" && !hasActiveSubscription && (
          <PremiumLockScreen pageName="Progress & Assessment" onSubscribe={() => patchState({ activeSidebar: "subscription" })} />
        )}

        {!isAdmin && state.activeSidebar === "progress" && hasActiveSubscription && (
          <section className="progress-section">
            <div className="applications-head">
              <div>
                <h1>Progress & Assessment</h1>
                <p>Track your mentorship courses and certification exam readiness.</p>
              </div>
            </div>

            <div className="summary-grid progress-summary-grid">
              <article className="summary-card progress-metric-card">
                <span className="metric-icon violet-text">
                  <Users size={15} />
                </span>
                <strong>{enrolledCourses}</strong>
                <span>Enrolled Courses</span>
              </article>
              <article className="summary-card progress-metric-card">
                <span className="metric-icon mint-text">
                  <LineChart size={15} />
                </span>
                <strong className="mint-text">{avgCompletion}%</strong>
                <span>Avg Completion</span>
              </article>
              <article className="summary-card progress-metric-card">
                <span className="metric-icon gold-text">
                  <ShieldCheck size={15} />
                </span>
                <strong className="gold-text">{certsReady}</strong>
                <span>Certs Ready</span>
              </article>
            </div>

            <div className="applications-tabs progress-tabs">
              {progressTabs.map((tab) => (
                <button key={tab.id} className={`applications-tab${state.progressTab === tab.id ? " active" : ""}`} type="button" onClick={() => patchState({ progressTab: tab.id })}>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="progress-card-list">
              {visibleProgressCards.map((card) => (
                <article key={card.id} className={`progress-card ${card.statusClass}`}>
                  <div className="progress-card-head">
                    <div className={`listing-avatar ${card.accent}`}>{card.initial}</div>
                    <div className="application-copy">
                      <h3>{card.mentor}</h3>
                      <p>{card.role}</p>
                    </div>
                    <span className={`status-badge ${card.statusClass}`}>{card.status}</span>
                  </div>

                  <div className="progress-divider" />

                  <div className="progress-body">
                    <h3 className="progress-title">{card.title}</h3>
                    <div className="progress-meta-line">
                      <span>{card.weeks}</span>
                      <span>{card.progress}%</span>
                    </div>
                    <div className="course-progress-bar">
                      <span style={{ width: `${card.progress}%` }} className={card.accent} />
                    </div>

                    <div className="assessment-block">
                      <p>Assessment Scores</p>
                      <div className="assessment-list">
                        {card.scores.map((score) => (
                          <div key={score.label} className="assessment-row">
                            <span>{score.label}</span>
                            <div className="assessment-bar-wrap">
                              <div className="assessment-bar">
                                <span style={{ width: `${score.value}%` }} className={score.accent} />
                              </div>
                              <strong>{score.value}%</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="assessment-average">
                        <LineChart size={13} />
                        <span>Average: {card.average}%</span>
                      </div>
                    </div>

                    <div className="progress-footer">
                      <div className="progress-tags">
                        {card.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <span className="next-date">Next: {card.next}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "roadmap" && !hasActiveSubscription && (
          <PremiumLockScreen pageName="Career Roadmap" onSubscribe={() => patchState({ activeSidebar: "subscription" })} />
        )}

        {!isAdmin && state.activeSidebar === "roadmap" && hasActiveSubscription && (
          <section className="roadmap-section">
            <div className="applications-head">
              <div>
                <h1>Career Roadmap</h1>
                <p>Your personalised path to Senior Full-Stack Engineer.</p>
              </div>
            </div>

            <div className="roadmap-meta">
              <span className="status-badge ready">Phase 1 Active</span>
              <span>Est. completion: Oct 2026</span>
            </div>

            <div className="roadmap-timeline">
              {roadmapItems.map((item, index) => (
                <div key={item.id} className="roadmap-row">
                  <div className="timeline-node-wrap">
                    <div className={`timeline-node ${item.nodeClass}`}>{item.nodeClass === "done" ? <BadgeCheck size={13} /> : null}</div>
                    {index < roadmapItems.length - 1 && <div className={`timeline-line ${item.nodeClass}`} />}
                  </div>

                  <article className={`roadmap-card interactive-card ${item.nodeClass}`} onClick={() => toggleRoadmapItem(item.id)}>
                    <div className="roadmap-card-top">
                      <div>
                        <div className="roadmap-labels">
                          <span className={`roadmap-label ${item.nodeClass}`}>{item.label}</span>
                          <span>{item.range}</span>
                          {item.status ? <span className={`status-badge ${item.statusClass}`}>{item.status}</span> : null}
                        </div>
                        <h3>{item.title}</h3>
                      </div>
                      <button
                        className="expand-button"
                        type="button"
                        aria-label="Toggle roadmap step"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleRoadmapItem(item.id);
                        }}
                      >
                        {item.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {item.expanded && (
                      <div className="roadmap-body">
                        <div className="roadmap-section-block">
                          <p>Skills</p>
                          <div className="progress-tags">
                            {item.skills.map((skill) => (
                              <span key={skill}>{skill}</span>
                            ))}
                          </div>
                        </div>

                        <div className="roadmap-section-block">
                          <p>Actions</p>
                          <div className="roadmap-actions">
                            {item.actions.map((action) => (
                              <div key={action} className="roadmap-action">
                                <ArrowRight size={12} />
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          className="roadmap-cta"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            patchState({ activeSidebar: "mentorship" });
                          }}
                        >
                          <BookOpen size={14} />
                          View Recommended Courses
                        </button>
                      </div>
                    )}
                  </article>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "mentorship" && !hasActiveSubscription && (
          <PremiumLockScreen pageName="Mentorship" onSubscribe={() => patchState({ activeSidebar: "subscription" })} />
        )}

        {!isAdmin && state.activeSidebar === "mentorship" && hasActiveSubscription && (
          <section className="mentorship-section">
            <div className="applications-head">
              <div>
                <h1>Mentorship</h1>
                <p>Courses created and taught by industry mentors. Apply to join a cohort.</p>
              </div>
            </div>

            <div className="roadmap-meta">
              <span className="status-badge in-progress">Mentor-led | Live sessions</span>
              <span>{mentorshipCourses.length} courses available</span>
            </div>

            <div className="progress-card-list">
              {mentorshipCourses.map((course) => {
                const applied = state.mentorshipApplied.includes(course.id);

                return (
                  <article key={course.id} className="mentor-card">
                    <div className="mentor-head">
                      <div className={`listing-avatar ${course.accent}`}>{course.initial}</div>
                      <div className="application-copy">
                        <h3>{course.mentor}</h3>
                        <p>{course.role}</p>
                      </div>
                      <div className="mentor-rating">
                        <div className="mentor-rating-top">
                          <span className="gold-text">
                            <Star size={12} />
                            {course.rating}
                          </span>
                        </div>
                        <p>{course.enrolled.toLocaleString()} students</p>
                      </div>
                    </div>

                    <div className="progress-divider" />

                    <div className="mentor-body">
                      <div className="mentor-badges-price">
                        <div className="mentor-badges">
                          {course.badges.map((badge) => (
                            <span key={badge} className={`status-badge ${badge === "High Demand" ? "reviewed" : "saved"}`}>
                              {badge}
                            </span>
                          ))}
                        </div>
                        <strong>{course.price}</strong>
                      </div>

                      <h3 className="progress-title">{course.title}</h3>
                      <p className="mentor-description">{course.description}</p>

                      <div className="progress-tags">
                        {course.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>

                      <div className="mentor-info-grid">
                        <span>{course.duration}</span>
                        <span>{course.schedule}</span>
                        <span>Starts {course.start}</span>
                        <span>{course.spotsLeft} spots left</span>
                      </div>

                      <div className="mentor-enrolled-row">
                        <span>{course.enrolled} enrolled</span>
                        <span>{course.spotsLeft} spots left</span>
                      </div>
                      <div className="course-progress-bar mentor-progress-bar">
                        <span style={{ width: `${Math.max(20, 100 - course.spotsLeft)}%` }} className="violet" />
                      </div>

                      <button className="roadmap-cta" type="button" onClick={() => applyToMentorship(course.id)}>
                        {applied ? "Application Submitted" : "Apply for This Course"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "certifications" && !hasActiveSubscription && (
          <PremiumLockScreen pageName="Certifications" onSubscribe={() => patchState({ activeSidebar: "subscription" })} />
        )}

        {!isAdmin && state.activeSidebar === "certifications" && hasActiveSubscription && (
          <section className="certifications-section">
            <div className="applications-head">
              <div>
                <h1>Certifications</h1>
                <p>Industry certifications sourced from official partner websites.</p>
              </div>
            </div>

            <div className="roadmap-meta">
              <span className="status-badge ready">Official Partners</span>
              <span>Links to practice exams and official exam portals</span>
            </div>

            <div className="cert-filter-row">
              {certificationCategories.map((category) => (
                <button
                  key={category}
                  className={`cert-filter-chip${state.certificationFilter === category ? " active" : ""}`}
                  type="button"
                  onClick={() => patchState({ certificationFilter: category })}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="progress-card-list">
              {filteredCertifications.map((cert) => {
                const practiced = state.certificationPractice.includes(cert.id);
                const portalVisited = state.certificationPortalVisits.includes(cert.id);

                return (
                  <article key={cert.id} className="cert-card">
                    <div className="mentor-head">
                      <div className="cert-provider">{cert.provider}</div>
                      <div className="application-copy">
                        <div className="mentor-badges">
                          <span className="status-badge saved">{cert.level}</span>
                          <span className="status-badge saved">{cert.track}</span>
                        </div>
                        <h3>{cert.title}</h3>
                        <p>{cert.subtitle}</p>
                      </div>
                      <div className="cert-relevance">
                        <span>Relevance</span>
                        <div className="cert-relevance-bar">
                          <span style={{ width: `${cert.relevance}%` }} />
                        </div>
                        <strong>{cert.relevance}%</strong>
                      </div>
                    </div>

                    <p className="mentor-description">{cert.description}</p>

                    <div className="progress-tags">
                      {cert.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>

                    <div className="cert-actions">
                      <button className="ghost-action" type="button" onClick={() => startPracticeExam(cert.id)}>
                        {practiced ? "Practice Started" : "Practice Exam"}
                      </button>
                      <button className="roadmap-cta cert-cta" type="button" onClick={() => visitPortal(cert.id)}>
                        <SquareArrowOutUpRight size={14} />
                        {portalVisited ? "Portal Visited" : "Official Exam Portal"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {state.profilePanelOpen && (
        <div className="profile-overlay" onClick={() => patchState({ profilePanelOpen: false })}>
          <aside className="profile-panel" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header">
              <div className="profile-panel-user">
                <div className="sidebar-avatar large">
                  {state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt={`${state.profile.fullName} avatar`} className="sidebar-avatar-image" /> : profileInitials}
                </div>
                <div>
                  <strong>{state.profile.fullName}</strong>
                  <span>{state.profile.username}</span>
                </div>
              </div>
              <button className="profile-close profile-close-text" type="button" onClick={logoutUser}>
                Logout
              </button>
            </div>

            <div className="profile-tab-row">
              {profileTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`profile-tab${state.profilePanelTab === tab.id ? " active" : ""}`}
                  type="button"
                  onClick={() => patchState({ profilePanelTab: tab.id })}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="profile-panel-body">
              {state.profilePanelTab === "info" && !isAdmin && (
                <div className="profile-section-stack">
                  <div className="profile-label-group">
                    <span className="profile-label">User Role</span>
                    <div className="profile-role-box">
                      <strong>{state.profile.role}</strong>
                      <span>Profile built for internships, OJT placements, volunteer roles, and fresh grad hiring.</span>
                    </div>
                  </div>


                  <div className="profile-subscription-card">
                    <div>
                      <span className="profile-subscription-kicker">Subscription</span>
                      <h3>
                        {hasActiveSubscription
                          ? state.subscription?.plan || "Applicant Premium"
                          : "Free Applicant"}
                      </h3>
                      <p>
                        {hasActiveSubscription
                          ? `Your subscription will renew on ${formatSubscriptionDate(state.subscription?.renewalDate)}.`
                          : "You are currently using the free applicant plan."}
                      </p>
                    </div>

                    <div className="profile-subscription-status">
                      <span className={`subscription-status-pill ${hasActiveSubscription ? "active" : "free"}`}>
                        {hasActiveSubscription ? "Active" : "Free"}
                      </span>

                      {!hasActiveSubscription && (
                        <button
                          className="profile-subscription-button"
                          type="button"
                          onClick={() => {
                            patchState({ activeSidebar: "subscription", profilePanelOpen: false });
                          }}
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="profile-field full">
                    <span>
                      Email <em>locked</em>
                    </span>
                    <div className="profile-input-wrap">
                      <AtSign size={14} />
                      <input value={state.profile.email} disabled />
                    </div>
                  </label>

                  <div className="profile-grid">
                    <label className="profile-field">
                      <span>First Name</span>
                      <div className="profile-input-wrap">
                        <User size={14} />
                        <input value={state.profile.firstName} onChange={(event) => patchProfile("firstName", event.target.value)} />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Last Name</span>
                      <div className="profile-input-wrap">
                        <User size={14} />
                        <input value={state.profile.lastName} onChange={(event) => patchProfile("lastName", event.target.value)} />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Career Title</span>
                      <div className="profile-input-wrap">
                        <BriefcaseBusiness size={14} />
                        <input value={state.profile.jobTitle} onChange={(event) => patchProfile("jobTitle", event.target.value)} />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Location</span>
                      <div className="profile-input-wrap">
                        <MapPin size={14} />
                        <input value={state.profile.location} onChange={(event) => patchProfile("location", event.target.value)} />
                      </div>
                    </label>
                  </div>

                  <label className="profile-field full">
                    <span>Portfolio</span>
                    <div className="profile-input-wrap">
                      <Globe size={14} />
                      <input value={state.profile.portfolio} onChange={(event) => patchProfile("portfolio", event.target.value)} />
                    </div>
                  </label>

                  <div className="profile-list-block">
                    <span className="profile-label">Profile Photo</span>
                    <label className="certificate-upload-box">
                      <input type="file" accept="image/*" onChange={handleProfilePhotoChange} />
                      <span>{state.profile.avatarUrl ? "Replace profile photo" : "Upload a profile photo"}</span>
                    </label>
                    {state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt="Profile preview" className="profile-photo-preview" /> : null}
                  </div>

                  <label className="profile-field full">
                    <span>About</span>
                    <textarea value={state.profile.about} onChange={(event) => patchProfile("about", event.target.value)} rows={4} />
                  </label>

                  <div className="profile-list-block">
                    <span className="profile-label">Experience</span>
                    {state.profileExperience.length > 0 ? (
                      <div className="profile-card-list">
                        {state.profileExperience.map((item) => (
                          <div key={item.id} className="profile-mini-card">
                            <div>
                              <strong>{item.title}</strong>
                              <p>
                                {item.company} | {item.period}
                              </p>
                            </div>
                            <span>{item.years}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="profile-empty-card">No experience added yet.</div>
                    )}
                    <div className="profile-entry-grid">
                      <label className="profile-field">
                        <span>Role</span>
                        <div className="profile-input-wrap">
                          <BriefcaseBusiness size={14} />
                          <input value={experienceForm.title} onChange={(event) => patchExperienceForm("title", event.target.value)} placeholder="Embedded Systems Intern" />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Organization</span>
                        <div className="profile-input-wrap">
                          <Globe size={14} />
                          <input value={experienceForm.company} onChange={(event) => patchExperienceForm("company", event.target.value)} placeholder="Company or school org" />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Period</span>
                        <div className="profile-input-wrap">
                          <FileText size={14} />
                          <input value={experienceForm.period} onChange={(event) => patchExperienceForm("period", event.target.value)} placeholder="Jun 2026 - Aug 2026" />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Duration</span>
                        <div className="profile-input-wrap">
                          <LineChart size={14} />
                          <input value={experienceForm.years} onChange={(event) => patchExperienceForm("years", event.target.value)} placeholder="3 mos" />
                        </div>
                      </label>
                    </div>
                    <button className="profile-dashed-button" type="button" onClick={addExperienceCard}>
                      Add Experience
                    </button>
                  </div>

                  <div className="profile-list-block">
                    <span className="profile-label">Change Password</span>
                    <div className="profile-entry-grid">
                      <label className="profile-field">
                        <span>New Password</span>
                        <div className="profile-input-wrap">
                          <ShieldCheck size={14} />
                          <input
                            type="password"
                            value={passwordForm.password}
                            onChange={(event) => patchPasswordForm("password", event.target.value)}
                            placeholder="Enter a new password"
                          />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Confirm Password</span>
                        <div className="profile-input-wrap">
                          <ShieldCheck size={14} />
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) => patchPasswordForm("confirmPassword", event.target.value)}
                            placeholder="Confirm your new password"
                          />
                        </div>
                      </label>
                    </div>
                    {passwordFeedback ? <p className="auth-feedback">{passwordFeedback}</p> : null}
                    <button className="profile-dashed-button" type="button" onClick={changePasswordFromProfile}>
                      Update Password
                    </button>
                  </div>

                  <div className="profile-action-row">
                    <button className="profile-primary-button" type="button" onClick={saveProfileChanges}>
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {state.profilePanelTab === "info" && isAdmin && (
                <div className="profile-section-stack">
                  <div className="profile-label-group">
                    <span className="profile-label">Admin Access</span>
                    <div className="profile-role-box">
                      <strong>{state.profile.role}</strong>
                      <span>Use this account to manage approvals, platform content, user verification, revenue, and admin-side operations.</span>
                    </div>
                  </div>

                  <label className="profile-field full">
                    <span>
                      Email <em>locked</em>
                    </span>
                    <div className="profile-input-wrap">
                      <AtSign size={14} />
                      <input value={state.profile.email} disabled />
                    </div>
                  </label>

                  <div className="profile-grid">
                    <label className="profile-field">
                      <span>First Name</span>
                      <div className="profile-input-wrap">
                        <User size={14} />
                        <input value={state.profile.firstName} onChange={(event) => patchProfile("firstName", event.target.value)} />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Last Name</span>
                      <div className="profile-input-wrap">
                        <User size={14} />
                        <input value={state.profile.lastName} onChange={(event) => patchProfile("lastName", event.target.value)} />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Admin Title</span>
                      <div className="profile-input-wrap">
                        <BriefcaseBusiness size={14} />
                        <input
                          value={state.profile.jobTitle}
                          onChange={(event) => patchProfile("jobTitle", event.target.value)}
                          placeholder="Platform Administrator"
                        />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Location</span>
                      <div className="profile-input-wrap">
                        <MapPin size={14} />
                        <input value={state.profile.location} onChange={(event) => patchProfile("location", event.target.value)} placeholder="Manila, Philippines" />
                      </div>
                    </label>
                  </div>

                  <label className="profile-field full">
                    <span>Username</span>
                    <div className="profile-input-wrap">
                      <AtSign size={14} />
                      <input
                        value={state.profile.username}
                        onChange={(event) => patchProfile("username", event.target.value)}
                        placeholder="@admin.name"
                      />
                    </div>
                  </label>

                  <div className="profile-list-block">
                    <span className="profile-label">Profile Photo</span>
                    <label className="certificate-upload-box">
                      <input type="file" accept="image/*" onChange={handleProfilePhotoChange} />
                      <span>{state.profile.avatarUrl ? "Replace profile photo" : "Upload a profile photo"}</span>
                    </label>
                    {state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt="Profile preview" className="profile-photo-preview" /> : null}
                  </div>

                  <label className="profile-field full">
                    <span>Admin Summary</span>
                    <textarea
                      value={state.profile.about}
                      onChange={(event) => patchProfile("about", event.target.value)}
                      rows={4}
                      placeholder="Describe this admin account's responsibilities or internal ownership."
                    />
                  </label>

                  <div className="profile-list-block">
                    <span className="profile-label">Access Scope</span>
                    <div className="progress-tags">
                      {adminSidebarItems.map((item) => (
                        <span key={item.id}>{item.label}</span>
                      ))}
                    </div>
                  </div>

                  <div className="profile-action-row">
                    <button className="profile-primary-button" type="button" onClick={saveProfileChanges}>
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {state.profilePanelTab === "skills" && !isAdmin && (
                <div className="profile-section-stack">
                  <div className="profile-list-block">
                    <span className="profile-label">My Skills</span>
                    <div className="skill-box">
                      <div className="skill-chip-list">
                        {state.profile.skills.map((skill) => (
                          <button key={skill} className="skill-chip" type="button" onClick={() => removeSkill(skill)}>
                            {skill} x
                          </button>
                        ))}
                      </div>
                      <input className="skill-entry" placeholder="Add skill..." onKeyDown={addSkillFromInput} />
                    </div>
                    <small>Press Enter to add</small>
                  </div>

                  <div className="profile-list-block">
                    <span className="profile-label">Certificates</span>
                    {state.profileCertificates.length > 0 ? (
                      <div className="profile-card-list">
                        {state.profileCertificates.map((item) => (
                          <div key={item.id} className="profile-mini-card">
                            <div>
                              <div className="profile-inline-heading">
                                <strong>{item.title}</strong>
                                <span className={`status-badge ${item.status === "Approved" ? "ready" : item.status === "Rejected" ? "saved" : "reviewed"}`}>
                                  {item.status || "Pending"}
                                </span>
                              </div>
                              <p>
                                {item.source} | {item.date}
                              </p>
                              {item.photoName ? <p>Proof attached: {item.photoName}</p> : null}
                            </div>
                            {item.photoPreview ? <img src={item.photoPreview} alt={`${item.title} certificate proof`} className="certificate-proof-thumb" /> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="profile-empty-card">No certificates submitted yet.</div>
                    )}
                    <div className="profile-entry-grid">
                      <label className="profile-field">
                        <span>Certificate</span>
                        <div className="profile-input-wrap">
                          <ShieldCheck size={14} />
                          <input value={certificateForm.title} onChange={(event) => patchCertificateForm("title", event.target.value)} placeholder="AWS Cloud Practitioner" />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Provider</span>
                        <div className="profile-input-wrap">
                          <BookOpen size={14} />
                          <input value={certificateForm.source} onChange={(event) => patchCertificateForm("source", event.target.value)} placeholder="AWS / Coursera / school" />
                        </div>
                      </label>
                      <label className="profile-field full">
                        <span>Completion or Issue Date</span>
                        <div className="profile-input-wrap">
                          <FileText size={14} />
                          <input value={certificateForm.date} onChange={(event) => patchCertificateForm("date", event.target.value)} placeholder="May 2026" />
                        </div>
                      </label>
                      <label className="profile-field full">
                        <span>Certificate Photo</span>
                        <label className="certificate-upload-box">
                          <input type="file" accept="image/*" onChange={handleCertificatePhotoChange} />
                          <span>{certificateForm.photoName || "Upload a clear certificate image for admin review"}</span>
                        </label>
                        {certificateForm.photoPreview ? <img src={certificateForm.photoPreview} alt="Certificate upload preview" className="certificate-proof-image" /> : null}
                      </label>
                    </div>
                    <button className="profile-dashed-button" type="button" onClick={addCertificateCard}>
                      Submit Certificate for Review
                    </button>
                  </div>

                  <div className="profile-list-block">
                    <span className="profile-label">Volunteer Activities</span>
                    {state.volunteerActivities.length > 0 ? (
                      <div className="profile-card-list">
                        {state.volunteerActivities.map((item) => (
                          <div key={item.id} className="profile-mini-card">
                            <div>
                              <div className="profile-inline-heading">
                                <strong>{item.org}</strong>
                                <span className={`status-badge ${item.status === "Active" ? "ready" : "saved"}`}>{item.status}</span>
                              </div>
                              <p>{item.role}</p>
                              <p>{item.last}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="profile-empty-card">No volunteer activities added yet.</div>
                    )}
                    <div className="profile-entry-grid">
                      <label className="profile-field">
                        <span>Organization</span>
                        <div className="profile-input-wrap">
                          <Users size={14} />
                          <input value={volunteerForm.org} onChange={(event) => patchVolunteerForm("org", event.target.value)} placeholder="Code for the Philippines" />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Role</span>
                        <div className="profile-input-wrap">
                          <User size={14} />
                          <input value={volunteerForm.role} onChange={(event) => patchVolunteerForm("role", event.target.value)} placeholder="Volunteer Developer" />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Status</span>
                        <div className="profile-input-wrap">
                          <BadgeCheck size={14} />
                          <select value={volunteerForm.status} onChange={(event) => patchVolunteerForm("status", event.target.value)}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Last Activity</span>
                        <div className="profile-input-wrap">
                          <FileText size={14} />
                          <input value={volunteerForm.last} onChange={(event) => patchVolunteerForm("last", event.target.value)} placeholder="Last activity: May 28, 2026" />
                        </div>
                      </label>
                    </div>
                    <button className="profile-dashed-button" type="button" onClick={addVolunteerCard}>
                      Add Volunteer Activity
                    </button>
                  </div>
                </div>
              )}

              {state.profilePanelTab === "resume" && !isAdmin && (
                <div className="profile-section-stack">
                  <label className="resume-dropzone">
                    <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleResumeFileUpload} />
                    <div className="resume-drop-icon">
                      <Upload size={18} />
                    </div>
                    <strong>{state.aiStatus.analyzingResume ? "Analyzing your resume..." : "Drop your CV here"}</strong>
                    <p>PDF, DOCX, TXT | AI extracts your skills, likely roles, and summary</p>
                    <span className="resume-browse">{state.aiStatus.analyzingResume ? "Processing..." : "Browse files"}</span>
                  </label>

                  <div className="resume-current-card">
                    <div>
                      <strong>Active Resume</strong>
                      <p>
                        {state.profile.resumeFileName} | {state.profile.resumeUploadedAt}
                      </p>
                    </div>
                  </div>

                  {state.profile.aiProfile && (
                    <div className="resume-ai-card">
                      <div className="profile-inline-heading">
                        <strong>AI Resume Summary</strong>
                        <span className="status-badge ready">Gemini</span>
                      </div>
                      <p>{state.profile.aiProfile.summary}</p>
                      <div className="progress-tags">
                        {(state.profile.aiProfile.suggested_roles ?? []).slice(0, 3).map((role) => (
                          <span key={role}>{role}</span>
                        ))}
                      </div>
                      <div className="progress-tags">
                        {(state.profile.aiProfile.improvement_skills ?? []).slice(0, 4).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {state.aiStatus.error && <p className="ai-error-message">{state.aiStatus.error}</p>}

                  <div className="resume-import-divider">
                    <span>Or Import From</span>
                  </div>

                  <div className="resume-import-row">
                    <input
                      placeholder="linkedin.com/in/your-name"
                      value={state.profile.linkedIn}
                      onChange={(event) => patchProfile("linkedIn", event.target.value)}
                    />
                    <button className="profile-primary-button small" type="button" onClick={importLinkedInProfile}>
                      Import
                    </button>
                  </div>
                </div>
              )}

              {state.profilePanelTab === "security" && isAdmin && (
                <div className="profile-section-stack">
                  <div className="profile-role-box">
                    <strong>Security Settings</strong>
                    <span>Update this admin account password here. Changes apply to your next authenticated session immediately.</span>
                  </div>

                  <div className="profile-list-block">
                    <span className="profile-label">Signed-in Account</span>
                    <div className="progress-tags">
                      <span>{state.profile.email}</span>
                      <span>{state.profile.role}</span>
                      <span>{state.profile.jobTitle || "Platform Administrator"}</span>
                    </div>
                  </div>

                  <div className="profile-list-block">
                    <span className="profile-label">Change Password</span>
                    <div className="profile-entry-grid">
                      <label className="profile-field">
                        <span>New Password</span>
                        <div className="profile-input-wrap">
                          <ShieldCheck size={14} />
                          <input
                            type="password"
                            value={passwordForm.password}
                            onChange={(event) => patchPasswordForm("password", event.target.value)}
                            placeholder="Enter a new password"
                          />
                        </div>
                      </label>
                      <label className="profile-field">
                        <span>Confirm Password</span>
                        <div className="profile-input-wrap">
                          <ShieldCheck size={14} />
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) => patchPasswordForm("confirmPassword", event.target.value)}
                            placeholder="Confirm your new password"
                          />
                        </div>
                      </label>
                    </div>
                    {passwordFeedback ? <p className="auth-feedback">{passwordFeedback}</p> : null}
                    <button className="profile-dashed-button" type="button" onClick={changePasswordFromProfile}>
                      Update Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {state.authModalOpen && (
        <div className="profile-overlay auth-overlay" onClick={closeAuthModal}>
          <aside className="profile-panel auth-panel" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header">
              <div className="profile-panel-user">
                <div className="sidebar-avatar large">
                  {state.authMode === "signup" ? "UP" : state.authMode === "forgot" ? "FP" : state.authMode === "reset" ? "RP" : "IN"}
                </div>
                <div>
                  <strong>
                    {state.authMode === "signup"
                      ? "Create Account"
                      : state.authMode === "forgot"
                        ? "Forgot Password"
                        : state.authMode === "reset"
                          ? "Reset Password"
                          : "Login"}
                  </strong>
                  <span>
                    {state.authMode === "signup"
                      ? "Start applying and saving roles"
                      : state.authMode === "forgot"
                        ? "Send a secure reset link to your email"
                        : state.authMode === "reset"
                          ? "Choose a new password for your account"
                          : "Access your SkillBridge profile"}
                  </span>
                </div>
              </div>
              <button className="profile-close" type="button" onClick={closeAuthModal}>
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body">
              <form className="profile-section-stack" onSubmit={submitAuth}>
                {(state.authMode === "login" || state.authMode === "signup") && (
                  <div className="auth-switch-row">
                    <button
                      className={`profile-tab${state.authMode === "login" ? " active" : ""}`}
                      type="button"
                      onClick={() => openAuthModal("login")}
                    >
                      Login
                    </button>
                    <button
                      className={`profile-tab${state.authMode === "signup" ? " active" : ""}`}
                      type="button"
                      onClick={() => openAuthModal("signup")}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                {state.authMode === "signup" && (
                  <>
                    <label className="profile-field full">
                      <span>Full Name</span>
                      <div className="profile-input-wrap">
                        <User size={14} />
                        <input value={authForm.name} onChange={(event) => patchAuthForm("name", event.target.value)} placeholder="Enter your full name" />
                      </div>
                    </label>

                    <div className="profile-field full">
                      <span>User Role</span>
                      <div className="auth-role-row">
                        {["Applicant", "Employer", "Admin"].map((role) => (
                          <button
                            key={role}
                            className={`auth-role-button${authForm.role === role ? " active" : ""}`}
                            type="button"
                            onClick={() => patchAuthForm("role", role)}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <label className="profile-field full">
                  <span>Email</span>
                  <div className="profile-input-wrap">
                    <AtSign size={14} />
                    <input value={authForm.email} onChange={(event) => patchAuthForm("email", event.target.value)} placeholder="Enter your email" />
                  </div>
                </label>

                {state.authMode !== "forgot" && (
                  <label className="profile-field full">
                    <span>{state.authMode === "reset" ? "New Password" : "Password"}</span>
                    <div className="profile-input-wrap">
                      <ShieldCheck size={14} />
                      <input
                        type="password"
                        value={authForm.password}
                        onChange={(event) => patchAuthForm("password", event.target.value)}
                        placeholder={
                          state.authMode === "login"
                            ? "Enter your password"
                            : state.authMode === "reset"
                              ? "Enter your new password"
                              : "Create a password"
                        }
                      />
                    </div>
                  </label>
                )}

                {state.authMode === "reset" && (
                  <label className="profile-field full">
                    <span>Confirm Password</span>
                    <div className="profile-input-wrap">
                      <ShieldCheck size={14} />
                      <input
                        type="password"
                        value={authForm.confirmPassword}
                        onChange={(event) => patchAuthForm("confirmPassword", event.target.value)}
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </label>
                )}

                {state.authMode === "login" && (
                  <button className="auth-inline-link" type="button" onClick={() => openAuthModal("forgot")}>
                    Forgot your password?
                  </button>
                )}

                {(state.authMode === "forgot" || state.authMode === "reset") && (
                  <button className="auth-inline-link" type="button" onClick={() => openAuthModal("login")}>
                    Back to login
                  </button>
                )}

                {authFeedback && <p className="auth-feedback">{authFeedback}</p>}

                <div className="profile-action-row">
                  <button className="profile-primary-button" type="submit">
                    {state.authMode === "login"
                      ? "Login"
                      : state.authMode === "signup"
                        ? "Create Account"
                        : state.authMode === "forgot"
                          ? "Send Reset Link"
                          : "Update Password"}
                  </button>
                  <button className="profile-danger-button" type="button" onClick={closeAuthModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      )}

      {selectedJob && (
        <div className="profile-overlay job-modal-overlay" onClick={() => patchState({ selectedJobId: null })}>
          <aside className="profile-panel job-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header">
              <div className="profile-panel-user">
                <div className={`sidebar-avatar large ${selectedJob.accent}`}>{selectedJob.initial}</div>
                <div>
                  <strong>{selectedJob.title}</strong>
                  <span>{selectedJob.company}</span>
                </div>
              </div>
              <button className="profile-close" type="button" onClick={() => patchState({ selectedJobId: null })}>
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body">
              <div className="profile-section-stack">
                <div className="job-modal-summary">
                  <div className="job-modal-meta">
                    <span>{selectedJob.setup}</span>
                    <span>{selectedJob.meta}</span>
                    <span>Posted {selectedJob.posted}</span>
                    <span>{selectedJob.applicants} applicants</span>
                  </div>
                  <div className={`listing-score ${getScoreToneClass(selectedJob.score)}`}>{selectedJob.score}</div>
                </div>

                {selectedJobRecommendation?.reason && <p className="listing-ai-reason modal-ai-reason">{selectedJobRecommendation.reason}</p>}

                <div className="profile-role-box">
                  <strong>About this job</strong>
                  <span>{selectedJob.sourceDescription || "The original job source did not provide a detailed description for this role."}</span>
                </div>

                {selectedJob.sourceResponsibilities.length > 0 ? (
                  <div className="profile-list-block">
                    <span className="profile-label">What You Will Do</span>
                    <div className="job-detail-list">
                      {selectedJob.sourceResponsibilities.map((item) => (
                        <div key={item} className="job-detail-item">
                          <ArrowRight size={12} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="profile-list-block">
                  <span className="profile-label">Employer Priorities</span>
                  <div className="job-detail-list">
                    {selectedJob.employerNotes.map((item) => (
                      <div key={item} className="job-detail-item">
                        <BadgeCheck size={12} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="profile-list-block">
                  <span className="profile-label">Employer Requirements</span>
                  <div className="progress-tags">
                    {selectedJob.requiredSkills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="profile-list-block">
                  <span className="profile-label">Skills You Already Match</span>
                  <div className="progress-tags">
                    {selectedJobMatchedSkills.length > 0 ? (
                      selectedJobMatchedSkills.map((skill) => <span key={skill}>{skill}</span>)
                    ) : (
                      <span>No direct skill matches yet</span>
                    )}
                  </div>
                </div>

                <div className="profile-list-block">
                  <span className="profile-label">Skill Gaps To Improve</span>
                  <div className="progress-tags danger-tags">
                    {selectedJob.gaps.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="profile-role-box">
                  <strong>Why this role fits you</strong>
                  <span>
                    {selectedJobFitReason}
                  </span>
                </div>

                <div className="profile-action-row">
                  <button className="profile-primary-button" type="button" onClick={() => applyToJob(selectedJob.id)}>
                    Apply for This Role
                  </button>
                  <button
                    className="profile-danger-button"
                    type="button"
                    onClick={() => toggleSave(selectedJob.id)}
                  >
                    {state.saved.includes(selectedJob.id) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {selectedAdminUser && (
        <div className="profile-overlay job-modal-overlay" onClick={() => patchState({ selectedAdminUserId: null })}>
          <aside className="profile-panel job-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header">
              <div className="profile-panel-user">
                <div className="sidebar-avatar large">{selectedAdminUser.name.slice(0, 1)}</div>
                <div>
                  <strong>{selectedAdminUser.name}</strong>
                  <span>{selectedAdminUser.username || selectedAdminUser.role}</span>
                </div>
              </div>
              <button className="profile-close" type="button" onClick={() => patchState({ selectedAdminUserId: null })}>
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body">
              <div className="profile-section-stack">
                <div className="job-modal-summary">
                  <div className="job-modal-meta">
                    <span>{selectedAdminUser.title || selectedAdminUser.role}</span>
                    <span>{selectedAdminUser.location || "Location not provided"}</span>
                    <span>{selectedAdminUser.email}</span>
                    <span>Joined {selectedAdminUser.joined}</span>
                  </div>
                  <span className={`status-badge ${getAdminStatusClass(selectedAdminUser.status)}`}>
                    {formatAdminUserStatus(selectedAdminUser.status)}
                  </span>
                </div>

                <div className="profile-role-box">
                  <strong>About this user</strong>
                  <span>{selectedAdminUser.about || "No additional user summary was provided."}</span>
                </div>

                <div className="profile-list-block">
                  <span className="profile-label">Registered Role</span>
                  <div className="progress-tags">
                    <span>{selectedAdminUser.role}</span>
                    {selectedAdminUser.title ? <span>{selectedAdminUser.title}</span> : null}
                  </div>
                </div>

                <div className="profile-list-block">
                  <span className="profile-label">Skills</span>
                  <div className="progress-tags">
                    {(selectedAdminUser.skills ?? []).length > 0 ? (
                      selectedAdminUser.skills.map((skill) => <span key={skill}>{skill}</span>)
                    ) : (
                      <span>No skills listed yet</span>
                    )}
                  </div>
                </div>

                <div className="profile-action-row">
                  {selectedAdminUser.status !== "Active" ? (
                    <button
                      className="profile-primary-button"
                      type="button"
                      disabled={state.adminUserActionId === selectedAdminUser.id}
                      onClick={() => updateAdminUserStatus(selectedAdminUser.id, "Active")}
                    >
                      {state.adminUserActionId === selectedAdminUser.id ? "Updating..." : "Verify User"}
                    </button>
                  ) : (
                    <button className="profile-primary-button" type="button" disabled>
                      User Verified
                    </button>
                  )}
                  <button
                    className="profile-danger-button"
                    type="button"
                    disabled={state.adminUserActionId === selectedAdminUser.id}
                    onClick={() =>
                      updateAdminUserStatus(
                        selectedAdminUser.id,
                        selectedAdminUser.status === "Suspended" ? "Active" : "Suspended",
                      )
                    }
                  >
                    {state.adminUserActionId === selectedAdminUser.id
                      ? "Updating..."
                      : selectedAdminUser.status === "Suspended"
                        ? "Unsuspend User"
                        : "Suspend User"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {selectedAdminCertification && (
        <div className="profile-overlay job-modal-overlay" onClick={() => patchState({ selectedAdminCertificationId: null })}>
          <aside className="profile-panel job-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header">
              <div className="profile-panel-user">
                <div className="cert-provider">{selectedAdminCertification.provider}</div>
                <div>
                  <strong>{selectedAdminCertification.title}</strong>
                  <span>{selectedAdminCertification.uploadedByName || "Unknown uploader"}</span>
                </div>
              </div>
              <button className="profile-close" type="button" onClick={() => patchState({ selectedAdminCertificationId: null })}>
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body">
              <div className="profile-section-stack">
                <div className="job-modal-summary">
                  <div className="job-modal-meta">
                    <span>{selectedAdminCertification.provider}</span>
                    <span>{selectedAdminCertification.submittedDate || selectedAdminCertification.uploadedAt || "Submission date not provided"}</span>
                    <span>{selectedAdminCertification.uploadedByEmail || "Email not provided"}</span>
                    <span>{selectedAdminCertification.uploadedAt ? `Uploaded ${selectedAdminCertification.uploadedAt}` : "Pending review"}</span>
                  </div>
                  <span className={`status-badge ${selectedAdminCertification.status === "Approved" ? "ready" : selectedAdminCertification.status === "Rejected" ? "saved" : "reviewed"}`}>
                    {selectedAdminCertification.status}
                  </span>
                </div>

                <div className="profile-role-box">
                  <strong>Uploaded by</strong>
                  <span>
                    {selectedAdminCertification.uploadedByName || "Unknown user"}
                    {selectedAdminCertification.uploadedByTitle ? ` | ${selectedAdminCertification.uploadedByTitle}` : ""}
                    {selectedAdminCertification.uploadedByLocation ? ` | ${selectedAdminCertification.uploadedByLocation}` : ""}
                  </span>
                </div>

                <div className="profile-list-block">
                  <span className="profile-label">Certificate Details</span>
                  <div className="progress-tags">
                    <span>{selectedAdminCertification.title}</span>
                    <span>{selectedAdminCertification.provider}</span>
                    {selectedAdminCertification.submittedDate ? <span>{selectedAdminCertification.submittedDate}</span> : null}
                  </div>
                </div>

                {selectedAdminCertification.photoPreview ? (
                  <div className="profile-list-block">
                    <span className="profile-label">Certificate Proof</span>
                    <div className="certificate-proof-block">
                      <img
                        src={selectedAdminCertification.photoPreview}
                        alt={`${selectedAdminCertification.title} certificate proof`}
                        className="certificate-proof-image"
                      />
                      <a className="auth-inline-link" href={selectedAdminCertification.photoPreview} target="_blank" rel="noreferrer">
                        Open proof image
                      </a>
                    </div>
                  </div>
                ) : null}

                <div className="profile-action-row">
                  {selectedAdminCertification.status !== "Approved" ? (
                    <button
                      className="profile-primary-button"
                      type="button"
                      onClick={() => updateAdminCollection("adminCertifications", selectedAdminCertification.id, "status", "Approved")}
                    >
                      Approve Certificate
                    </button>
                  ) : (
                    <button className="profile-primary-button" type="button" disabled>
                      Certificate Approved
                    </button>
                  )}
                  {selectedAdminCertification.status !== "Rejected" ? (
                    <button
                      className="profile-danger-button"
                      type="button"
                      onClick={() => updateAdminCollection("adminCertifications", selectedAdminCertification.id, "status", "Rejected")}
                    >
                      Reject Certificate
                    </button>
                  ) : (
                    <button className="profile-danger-button" type="button" disabled>
                      Rejected
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function createApplicationEntry(status = "Applied") {
  const stageIndex = applicationStages.indexOf(status);
  const stageDates = applicationStages.map((_, index) => (index === 0 ? getTodayShortDate() : ""));

  if (stageIndex > 0) {
    stageDates[stageIndex] = getTodayShortDate();
  }

  return {
    status,
    appliedDate: getTodayLongDate(),
    stageDates,
  };
}

function getTodayLongDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayLongDateFromValue(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return getTodayLongDate();
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCurrentUploadLabel() {
  return `Uploaded ${new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function normalizeComparableText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function getTodayShortDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default App;
