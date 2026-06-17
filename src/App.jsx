import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Compass,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Heart,
  Hash,
  LineChart,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MoonStar,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SquareArrowOutUpRight,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { buildCareerRoadmapFallback, fetchCareerRoadmaps, fetchLiveJobs, fetchRecommendedJobs, parseResumeProfile } from "./lib/ai";
import { hasSupabaseConfig, supabase } from "./lib/supabase";

const STORAGE_KEY = "skillbridge-career-studio";
const PENDING_OAUTH_ROLE_KEY = "skillbridge-pending-oauth-role";
const DEMO_ACCOUNT_EMAIL = "justine.alonzo@student.skillbridge.ph";
const applicationStages = ["Applied", "Reviewed", "Shortlisted", "Interview", "Offer"];
const ROADMAP_ENHANCEMENT_TIMEOUT_MS = 30000;

const sidebarItems = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "roadmap", label: "Roadmap", icon: MapIcon },
  { id: "training", label: "Development", icon: BookOpen },
  { id: "community", label: "Community", icon: MessageCircle },
  { id: "subscription", label: "Subscription", icon: CreditCard },
];

const premiumApplicantPages = ["training", "roadmap", "community"];
const legacyTrainingPages = ["progress", "mentorship", "certifications"];
const trainingTabs = [
  { id: "progress", label: "Training" },
  { id: "mentorship", label: "Mentorship" },
  { id: "certifications", label: "Certifications" },
];

const helpFaqs = [
  {
    question: "How do I look for jobs or opportunities?",
    answer: "Open Discover, choose a category, then use search and filters to browse recommended roles. Click a listing to review details, match score, required skills, and application actions.",
  },
  {
    question: "How do I apply for a role?",
    answer: "From Discover, open a job card and use the apply action. Applied roles are moved into Applications so you can track their status and progress.",
  },
  {
    question: "Where can I see my saved and applied jobs?",
    answer: "Go to Applications. Use the Applied and Saved tabs to switch between roles you already applied to and roles you saved for later review.",
  },
  {
    question: "Why are Roadmap and Development locked?",
    answer: "Roadmap, Development, and Community are premium applicant features. Free applicants can still use Discover, Applications, and Subscription, while subscribed applicants can unlock career roadmaps, training modules, mentorship, certifications, and community spaces.",
  },
  {
    question: "How do I generate a career roadmap?",
    answer: "Apply to up to three jobs first, then open Roadmap and click Generate Roadmap. The system creates guided steps based on your applied jobs and profile context.",
  },
  {
    question: "What is inside Development?",
    answer: "Development contains Training, Mentorship, and Certifications. Training shows course progress and module quizzes, Mentorship lists mentor-led courses, and Certifications links practice resources and official portals. Use the search bars in Mentorship and Certifications to quickly filter by title, mentor, provider, track, or skill.",
  },
  {
    question: "How does Community work?",
    answer: "Open Community from the sidebar after subscribing. Join a server to view its feed, post updates, react with hearts, comment on posts, and open that server to browse channels. Use the server search to filter available servers by name or description.",
  },
  {
    question: "How do I chat in a Community channel?",
    answer: "In Community, click a joined server to open its server popup. Channels appear on the left, and the selected channel chat appears on the right. Use the channel search to filter channels, or create a new channel inside the server popup.",
  },
  {
    question: "How do Community edit and delete buttons work?",
    answer: "Owners and authors see pencil and trash buttons on the items they created. Server owners can edit server descriptions, channel creators can edit channel descriptions, and authors can edit or delete their own posts, comments, and channel messages.",
  },
  {
    question: "Why do I not see Edit or Delete on some Community items?",
    answer: "Edit and Delete only appear for the account that created the item. If a Community database migration is missing, Supabase may also reject the save; apply the latest Community edit and message owner-action migrations, then reload the app.",
  },
  {
    question: "Can other SkillBridge users see my Community posts?",
    answer: "Yes. Community servers, channels, posts, reactions, comments, and channel messages are shared globally with other subscribed SkillBridge users.",
  },
  {
    question: "How do I contact support?",
    answer: "Use the Chat Support button above the Help button. You can send support messages now, but replies are not enabled yet because support chat still needs a dedicated API.",
  },
  {
    question: "How do I take a practice quiz?",
    answer: "Open Development, choose Training, then click Start Practice Test on a course module. Use the arrow buttons to move through questions; the quiz advances after each answer.",
  },
  {
    question: "How do I subscribe?",
    answer: "Open Subscription from the sidebar, review the premium benefits, then use the subscription action. After activation, premium pages become available to your applicant account.",
  },
  {
    question: "How do I update my profile or resume?",
    answer: "Click your profile area in the sidebar. From the profile panel, update your personal information, skills, experience, certificates, resume details, and password settings.",
  },
  {
    question: "What can admins do?",
    answer: "Admin accounts use a separate dashboard for user management, course management, certification approvals, mentor and employer verification, analytics, revenue, and content management.",
  },
];

const defaultCommunityServers = [
  {
    id: "frontend-lounge",
    name: "Frontend Guild",
    description: "React, UI reviews, portfolio polish, and interview prep.",
    inviteUrl: "https://discord.gg/frontend",
    members: 248,
    joined: true,
    channels: [
      {
        id: "frontend-lounge-general",
        name: "frontend-lounge",
        topic: "General frontend conversations and portfolio review swaps.",
        messages: [
          { id: 1, author: "Mika Reyes", role: "Frontend Intern", text: "Anyone reviewing React portfolios today? I can trade feedback after class.", time: "9:14 AM" },
          { id: 2, author: "SkillBridge Coach", role: "Mentor", text: "Drop screenshots or repo links here. Keep feedback specific and kind.", time: "9:21 AM" },
        ],
      },
      {
        id: "frontend-lounge-review",
        name: "code-review",
        topic: "Share snippets, repos, and UI questions for peer feedback.",
        messages: [],
      },
    ],
    posts: [
      {
        id: 1,
        author: "Lena Torres",
        role: "Mentor",
        text: "Portfolio tip: lead each project with the problem you solved before listing the tech stack.",
        likes: 42,
        likedByMe: false,
        comments: [
          { id: 1, author: "Mika Reyes", role: "Frontend Intern", text: "This helped me rewrite my capstone card. Thank you!", time: "Today" },
        ],
        time: "Today",
      },
    ],
  },
  {
    id: "ojt-openings",
    name: "OJT Opportunities",
    description: "Shared internships, OJT leads, referral notes, and application reminders.",
    inviteUrl: "https://discord.gg/ojt",
    members: 413,
    joined: false,
    channels: [
      {
        id: "ojt-openings-main",
        name: "openings",
        topic: "Post active internships, OJT listings, and referral leads.",
        messages: [
          { id: 1, author: "Andrea Lim", role: "Applicant", text: "Northstar has a QA internship closing Friday. Check the Discover tab too.", time: "Yesterday" },
        ],
      },
    ],
    posts: [
      {
        id: 1,
        author: "Marco Santos",
        role: "Student",
        text: "I made a tracker template for applications and interview dates. Happy to share the format here.",
        likes: 31,
        likedByMe: false,
        comments: [],
        time: "Yesterday",
      },
    ],
  },
  {
    id: "career-wins",
    name: "Career Wins",
    description: "Celebrate accepted applications, certifications, callbacks, and shipped projects.",
    inviteUrl: "https://discord.gg/careerwins",
    members: 167,
    joined: true,
    channels: [
      {
        id: "career-wins-main",
        name: "wins",
        topic: "Share progress, callbacks, offers, and course completions.",
        messages: [
          { id: 1, author: "Nina Cruz", role: "Applicant", text: "Passed my first technical interview. The SQL practice questions helped a lot.", time: "8:03 AM" },
        ],
      },
    ],
    posts: [
      {
        id: 1,
        author: "Nina Cruz",
        role: "Applicant",
        text: "Small win: got shortlisted after revising my resume summary from the profile feedback.",
        likes: 58,
        likedByMe: false,
        comments: [],
        time: "Today",
      },
    ],
  },
];

function DiscordLogo({ size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" focusable="false">
      <path
        fill="currentColor"
        d="M20.32 4.37A19.8 19.8 0 0 0 15.36 2.8a13.8 13.8 0 0 0-.64 1.3 18.3 18.3 0 0 0-5.44 0 13.5 13.5 0 0 0-.65-1.3A19.7 19.7 0 0 0 3.68 4.38C.55 9.05-.31 13.6.11 18.08a19.9 19.9 0 0 0 6.08 3.07c.49-.67.93-1.38 1.3-2.12a12.9 12.9 0 0 1-2.05-.98l.5-.39a14.2 14.2 0 0 0 12.12 0l.5.39c-.65.39-1.33.72-2.05.98.38.74.81 1.45 1.3 2.12a19.9 19.9 0 0 0 6.08-3.07c.5-5.19-.84-9.7-3.57-13.71ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42s2.18 1.1 2.16 2.42c0 1.34-.95 2.42-2.16 2.42Z"
      />
    </svg>
  );
}

const adminSidebarItems = [
  { id: "users", label: "User Management", icon: Users },
  { id: "courses", label: "Course Management", icon: BookOpen },
  { id: "certifications-admin", label: "Certification Approvals", icon: ShieldCheck },
  { id: "mentors", label: "Mentor Verification", icon: BadgeCheck },
  { id: "employers", label: "Employer Verification", icon: BriefcaseBusiness },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "revenue", label: "Revenue Management", icon: DollarSign },
  { id: "cms", label: "Content Management", icon: FileText },
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

function normalizePublicSignupRole(role) {
  return ["Applicant", "Student", "Employer"].includes(String(role || "").trim())
    ? String(role).trim()
    : "Applicant";
}

function mapStateCategoryToDbCategory(category) {
  if (category === "internships") return "Internship";
  if (category === "volunteer") return "Volunteer";
  if (category === "jobs") return "Job";
  return null;
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

function getDisplayJobDescription(description) {
  const cleaned = String(description || "").trim();
  const meaningfulWords = cleaned.match(/[a-z]{3,}/gi) ?? [];

  if (meaningfulWords.length < 12) {
    return "The original job source did not provide a detailed description for this role. Review the source listing for the latest responsibilities and requirements.";
  }

  return cleaned;
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

function partitionRequiredSkills(applicantSkills, requiredSkills) {
  const uniqueRequirements = [
    ...new Map(
      (requiredSkills ?? [])
        .map((skill) => String(skill || "").trim())
        .filter(Boolean)
        .map((skill) => [normalizeSkillForMatch(skill), skill]),
    ).values(),
  ];
  const matched = uniqueRequirements.filter((required) =>
    applicantSkills.some((skill) => skillsMatch(skill, required)),
  );
  const matchedKeys = new Set(matched.map(normalizeSkillForMatch));

  return {
    required: uniqueRequirements,
    matched,
    gaps: uniqueRequirements.filter((required) => !matchedKeys.has(normalizeSkillForMatch(required))),
  };
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

function computeJobTitleMatchScore(profile, listing) {
  const targetRoles = [profile.jobTitle, ...(profile.aiProfile?.suggested_roles ?? [])].filter(Boolean);
  const titleTerms = normalizeSearchTerms([listing.title]);
  const roleTerms = normalizeSearchTerms(targetRoles);

  if (roleTerms.length === 0) return 50;

  const overlap = roleTerms.filter((term) => titleTerms.includes(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(roleTerms.length, 1)) * 100 : 8;

  if (isJuniorProfile(profile) && isSeniorRole(listing.title)) {
    score = Math.min(score, 22);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeDescriptionSimilarityScore(profile, listing, matchedSkills) {
  const applicantTerms = normalizeSearchTerms([
    profile.about,
    profile.aiProfile?.summary,
    ...(profile.aiProfile?.strengths ?? []),
    ...(profile.aiProfile?.keywords ?? []),
    ...filterSpecificMatchedSkills(profile.skills ?? []),
  ]);
  const descriptionTerms = new Set(
    normalizeSearchTerms([listing.overview, ...(listing.sourceResponsibilities ?? []), ...listing.requiredSkills]),
  );

  if (applicantTerms.length === 0) return 45;

  const overlap = applicantTerms.filter((term) => descriptionTerms.has(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(Math.min(applicantTerms.length, 12), 1)) * 100 : 10;

  if (getDomainAlignmentScore(profile, listing, matchedSkills) < 40) {
    score = Math.min(score, countSpecificSkills(matchedSkills) > 0 ? 42 : 18);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeLocationMatchScore(profile, listing) {
  const profileLocation = String(profile.location || "").trim().toLowerCase();
  const listingText = `${listing.meta} ${listing.setup}`.toLowerCase();

  if (!profileLocation) return 55;
  if (listingText.includes(profileLocation)) return 100;
  if (listingText.includes("remote")) return 80;
  if (listingText.includes("hybrid")) return 65;
  return 20;
}

function getScoreToneClass(score) {
  if (score >= 80) return "score-green";
  if (score >= 60) return "score-yellow";
  return "score-red";
}

const matchScoreFactors = [
  { key: "job_title_match", label: "Job title fit", weight: 35 },
  { key: "skill_match", label: "Skill match", weight: 40 },
  { key: "description_similarity", label: "Description fit", weight: 25 },
];

function MatchScore({ listing, theme = "dark" }) {
  const breakdown = listing.scoreBreakdown;
  const scoreRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPositioned, setTooltipPositioned] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 12, top: 12 });
  const tooltipId = useId();

  useEffect(() => {
    if (!tooltipOpen) return undefined;

    function updateTooltipPosition() {
      const scoreRect = scoreRef.current?.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      if (!scoreRect || !tooltipRect) return;

      const viewportPadding = 12;
      const gap = 10;
      const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
      const left = Math.min(Math.max(scoreRect.right - tooltipRect.width, viewportPadding), maxLeft);
      const spaceBelow = window.innerHeight - scoreRect.bottom - viewportPadding;
      const spaceAbove = scoreRect.top - viewportPadding;
      const preferredTop =
        spaceBelow >= tooltipRect.height || spaceBelow >= spaceAbove
          ? scoreRect.bottom + gap
          : scoreRect.top - tooltipRect.height - gap;
      const maxTop = Math.max(viewportPadding, window.innerHeight - tooltipRect.height - viewportPadding);
      const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);

      setTooltipPosition({ left, top });
      setTooltipPositioned(true);
    }

    const frameId = window.requestAnimationFrame(updateTooltipPosition);
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [tooltipOpen]);

  const tooltip = (
    <div
      ref={tooltipRef}
      id={tooltipId}
      className={`match-score-tooltip viewport-tooltip theme-${theme}${tooltipOpen && tooltipPositioned ? " visible" : ""}`}
      role="tooltip"
      style={tooltipPosition}
    >
      <div className="match-score-tooltip-heading">
        <strong>{listing.score}% match</strong>
        <span>{breakdown?.limitedByEvidence ? `Capped at ${breakdown.evidenceCeiling}% by available evidence` : "Weighted fit score"}</span>
      </div>
      <div className="match-score-formula">
        {matchScoreFactors.map((factor) => {
          const factorScore = breakdown?.[factor.key] ?? 0;
          const contribution = Math.round((factorScore * factor.weight) / 100);

          return (
            <div key={factor.key} className="match-score-factor">
              <span>{factor.label} ({factor.weight}%)</span>
              <strong>{factorScore}% <small>+{contribution}</small></strong>
            </div>
          );
        })}
      </div>
      <p>
        Weighted total: <strong>{breakdown?.weightedTotal ?? listing.score}%</strong>
        {breakdown?.limitedByEvidence ? `, then limited to ${breakdown.evidenceCeiling}% by the profile's available skills, domain, or experience evidence.` : "."}
      </p>
      <div className="match-score-evidence">
        <span><strong>Matched:</strong> {listing.rawMatchedSkills?.join(", ") || "No direct skills yet"}</span>
        <span><strong>Gaps:</strong> {listing.gaps?.join(", ") || "No identified gaps"}</span>
      </div>
    </div>
  );

  return (
    <div
      className="match-score-wrap"
      onMouseEnter={() => {
        setTooltipPositioned(false);
        setTooltipOpen(true);
      }}
      onMouseLeave={() => setTooltipOpen(false)}
      onFocus={() => {
        setTooltipPositioned(false);
        setTooltipOpen(true);
      }}
      onBlur={() => setTooltipOpen(false)}
    >
      <div
        ref={scoreRef}
        className={`listing-score ${getScoreToneClass(listing.score)}`}
        tabIndex="0"
        aria-describedby={tooltipId}
        aria-label={`${listing.score}% match. Focus or hover for score breakdown.`}
      >
        {listing.score}
      </div>
      {tooltipOpen && typeof document !== "undefined" ? createPortal(tooltip, document.body) : null}
    </div>
  );
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
  const inferredRequiredSkills =
    Array.isArray(listing.requiredSkills) && listing.requiredSkills.length > 0
      ? listing.requiredSkills
      : extractListingSkills(listing.title, listing.meta, listing.overview, listing.setup, ...(listing.sourceResponsibilities ?? []));
  const requirementPartition = partitionRequiredSkills(profileSkills, inferredRequiredSkills);
  const requiredSkills = requirementPartition.required;
  const rawMatchedSkills = requirementPartition.matched;
  const matchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);
  const serverScore = typeof recommendation?.match_score === "number" ? clampScore(recommendation.match_score, 0, 100) : null;

  if (serverScore !== null) {
    const serverBreakdown = recommendation?.score_breakdown ?? {};
    const weightedTotal = Math.round(
      computeWeightedAverageScore(
        matchScoreFactors.map((factor) => ({
          score: serverBreakdown[factor.key] ?? 0,
          weight: factor.weight / 100,
        })),
      ),
    );

    return {
      matchedSkills,
      rawMatchedSkills,
      score: serverScore,
      fallbackScore: serverScore,
      judgeScore: serverScore,
      scoreBreakdown: {
        ...serverBreakdown,
        weightedTotal,
        evidenceCeiling: serverScore,
        limitedByEvidence: serverScore < weightedTotal,
      },
    };
  }

  const matchedCount = rawMatchedSkills.length;
  const specificRequiredSkills = requiredSkills.filter((skill) => !isGenericSkill(skill));
  const genericRequiredSkills = requiredSkills.filter((skill) => isGenericSkill(skill));
  const specificMatchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);
  const genericMatchedSkills = rawMatchedSkills.filter((skill) => isGenericSkill(skill));
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
  const titleMatchScore = computeJobTitleMatchScore(profile, listing);
  const descriptionSimilarityScore = computeDescriptionSimilarityScore(profile, listing, rawMatchedSkills);
  const fallbackScore = Math.round(
    computeWeightedAverageScore([
      { score: titleMatchScore, weight: 0.35 },
      { score: skillAlignmentScore, weight: 0.4 },
      { score: descriptionSimilarityScore, weight: 0.25 },
    ]),
  );
  const evidenceCeiling = getSkillEvidenceCeiling(requiredSkills.length, matchedCount, 0, 0);
  const finalScore = clampScore(Math.min(fallbackScore, evidenceCeiling));

  return {
    matchedSkills,
    rawMatchedSkills,
    score: finalScore,
    fallbackScore: clampScore(fallbackScore),
    judgeScore: typeof recommendation?.match_score === "number" ? clampScore(recommendation.match_score, 0, 100) : null,
    scoreBreakdown: {
      job_title_match: titleMatchScore,
      skill_match: skillAlignmentScore,
      description_similarity: descriptionSimilarityScore,
      weightedTotal: clampScore(fallbackScore),
      evidenceCeiling,
      limitedByEvidence: evidenceCeiling < fallbackScore,
    },
  };
}

function formatAnnouncementDate(value) {
  if (!value) return getTodayLongDate();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayLongDate();

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function mapAnnouncementRecord(record) {
  const title = record.title || "Untitled announcement";
  const body = record.body || "";
  const tag = String(record.tag || "").trim();
  const label = String(record.label || "").trim();
  const link = String(record.link_label || "").trim();

  return {
    id: record.id,
    tag,
    label,
    title,
    body,
    link,
    targetSidebar: record.target_page || "discover",
    targetCategory: record.target_category || null,
    date: formatAnnouncementDate(record.created_at),
    bannerUrl: record.link_target || "",
    isActive: record.is_active !== false,
    startsAt: record.starts_at || "",
    endsAt: record.ends_at || "",
    displayOrder: Number(record.display_order ?? 0),
  };
}

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

const practiceTestQuestionsByCourse = {
  "courses-1": [
    { id: 1, question: "In GraphQL, what does a schema primarily define?", options: ["Database indexes", "Available types, fields, and operations", "Server deployment region", "CSS module boundaries"], answer: 1 },
    { id: 2, question: "Which GraphQL operation is used to read data?", options: ["Mutation", "Subscription", "Query", "Resolver"], answer: 2 },
    { id: 3, question: "What is the main role of a resolver?", options: ["Style UI components", "Fetch or compute data for a schema field", "Compress API responses", "Create database tables automatically"], answer: 1 },
    { id: 4, question: "What does Apollo Client commonly manage in a frontend app?", options: ["GraphQL requests and normalized cache", "Operating system permissions", "DNS routing", "Git branching"], answer: 0 },
    { id: 5, question: "Which operation should change server-side data?", options: ["Query", "Mutation", "Fragment", "Directive"], answer: 1 },
    { id: 6, question: "What problem do GraphQL fragments help solve?", options: ["Duplicated field selections", "Expired SSL certificates", "Slow CSS selectors", "Untracked package versions"], answer: 0 },
    { id: 7, question: "Which feature supports real-time updates in GraphQL?", options: ["Fragments", "Aliases", "Subscriptions", "Interfaces"], answer: 2 },
    { id: 8, question: "What is overfetching?", options: ["Requesting more data than needed", "Caching too little data", "Sending invalid variables", "Running a query twice"], answer: 0 },
    { id: 9, question: "Why are GraphQL variables preferred over string-building query values?", options: ["They improve type safety and reuse", "They remove the need for resolvers", "They make every query public", "They disable caching"], answer: 0 },
    { id: 10, question: "What should be considered when designing production GraphQL APIs?", options: ["Only field names", "Auth, validation, pagination, and performance", "Button colors", "Browser zoom level"], answer: 1 },
  ],
  "courses-2": [
    { id: 1, question: "What is a common cause of unnecessary React re-renders?", options: ["Stable props", "Unchanged memoized values", "Creating new object props every render", "Using semantic HTML"], answer: 2 },
    { id: 2, question: "Which tool helps inspect component render performance?", options: ["React DevTools Profiler", "npm version", "CSS reset", "Git stash"], answer: 0 },
    { id: 3, question: "When is React.memo most useful?", options: ["For every component by default", "When a component often receives unchanged props", "Only for server code", "When removing state"], answer: 1 },
    { id: 4, question: "What does useMemo memoize?", options: ["A computed value", "A network port", "A CSS file", "A route path"], answer: 0 },
    { id: 5, question: "What does useCallback memoize?", options: ["A component tree snapshot", "A function reference", "A browser tab", "A package lock"], answer: 1 },
    { id: 6, question: "What can list virtualization improve?", options: ["Rendering very long lists", "Password strength", "DNS lookup", "Image copyright"], answer: 0 },
    { id: 7, question: "Which key choice is usually safest for dynamic lists?", options: ["Array index always", "A stable unique item id", "Math.random()", "The current timestamp"], answer: 1 },
    { id: 8, question: "What can code splitting reduce?", options: ["Initial JavaScript loaded by the page", "The number of users", "Database backups", "Keyboard shortcuts"], answer: 0 },
    { id: 9, question: "What should you do before optimizing a React app?", options: ["Measure the bottleneck", "Delete all hooks", "Rewrite in another language", "Disable errors"], answer: 0 },
    { id: 10, question: "Which pattern helps avoid passing props through many layers?", options: ["Prop drilling only", "Context or composition", "Duplicating state everywhere", "Hard-coding data"], answer: 1 },
  ],
  "prep-3": [
    { id: 1, question: "Which AWS model describes paying only for what you use?", options: ["Capital expense only", "Pay-as-you-go pricing", "Manual billing", "Fixed hardware leasing"], answer: 1 },
    { id: 2, question: "Which service provides scalable object storage?", options: ["Amazon S3", "Amazon EC2", "AWS IAM", "Amazon Route 53"], answer: 0 },
    { id: 3, question: "Which service manages users, groups, roles, and permissions?", options: ["Amazon VPC", "AWS IAM", "Amazon CloudFront", "AWS Lambda"], answer: 1 },
    { id: 4, question: "What is an Availability Zone?", options: ["A billing dashboard", "One or more isolated data centers in a Region", "A user permission", "A storage class only"], answer: 1 },
    { id: 5, question: "Which service runs virtual servers in AWS?", options: ["Amazon EC2", "Amazon S3 Glacier", "AWS Budgets", "Amazon SNS"], answer: 0 },
    { id: 6, question: "Which AWS pillar focuses on protecting data and systems?", options: ["Cost Optimization", "Security", "Performance Efficiency", "Operational Excellence"], answer: 1 },
    { id: 7, question: "Which tool can alert when spending crosses a threshold?", options: ["AWS Budgets", "Amazon Rekognition", "AWS Cloud9", "Amazon Polly"], answer: 0 },
    { id: 8, question: "What is AWS Lambda commonly used for?", options: ["Serverless code execution", "Manual cable management", "Static IP registration only", "Creating spreadsheets"], answer: 0 },
    { id: 9, question: "Which service is used for content delivery through edge locations?", options: ["Amazon CloudFront", "AWS IAM", "Amazon RDS", "AWS Organizations"], answer: 0 },
    { id: 10, question: "In the shared responsibility model, what does AWS generally manage?", options: ["Customer application code", "Physical infrastructure of the cloud", "Customer data classification", "User password choices"], answer: 1 },
  ],
  "prep-4": [
    { id: 1, question: "Which SQL clause filters rows before grouping?", options: ["ORDER BY", "WHERE", "HAVING", "LIMIT"], answer: 1 },
    { id: 2, question: "Which SQL clause filters grouped results?", options: ["HAVING", "SELECT", "FROM", "JOIN"], answer: 0 },
    { id: 3, question: "What does an INNER JOIN return?", options: ["Only unmatched left rows", "Rows with matching keys in both tables", "Every possible row combination", "Only duplicate columns"], answer: 1 },
    { id: 4, question: "Which aggregate returns the number of rows?", options: ["SUM", "AVG", "COUNT", "MIN"], answer: 2 },
    { id: 5, question: "What does GROUP BY usually do?", options: ["Combines rows into summary groups", "Deletes duplicate tables", "Encrypts values", "Sorts by default only"], answer: 0 },
    { id: 6, question: "Which function ranks rows within a partition?", options: ["RANK()", "COUNT()", "LOWER()", "ROUND()"], answer: 0 },
    { id: 7, question: "What is a common use of a CTE?", options: ["Make complex queries easier to read", "Replace every index", "Change database passwords", "Disable joins"], answer: 0 },
    { id: 8, question: "Which clause controls result order?", options: ["ORDER BY", "WHERE", "GROUP BY", "SELECT"], answer: 0 },
    { id: 9, question: "What does AVG(revenue) calculate?", options: ["Total revenue", "Largest revenue", "Average revenue", "Number of revenue rows only"], answer: 2 },
    { id: 10, question: "Which practice helps dashboard queries stay trustworthy?", options: ["Clear filters, tested joins, and documented metrics", "Random aliases", "Ignoring nulls always", "Removing all WHERE clauses"], answer: 0 },
  ],
};

const defaultPracticeTestQuestions = practiceTestQuestionsByCourse["courses-1"];

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

  if (role === "Student") {
    return {
      ...guestProfile,
      role: "Student",
      jobTitle: "Student / OJT Candidate",
      about: "Student account focused on internships, OJT opportunities, and volunteer experience that supports career growth.",
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
  trainingTab: "progress",
  progressTab: "courses",
  expandedRoadmapId: "",
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
    recommendationModel: "",
    semanticCandidates: 0,
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
  persistedApplications: [],
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
  announcements: [],
  adminAnnouncements: [],
  careerRoadmaps: [],
  community: {
    activeServerId: "frontend-lounge",
    activeChannelId: "frontend-lounge-general",
    activeChatChannelId: "",
    joinedServerIds: ["frontend-lounge", "career-wins"],
    servers: defaultCommunityServers,
    loading: false,
    error: "",
  },
  supportMessages: [],
  roadmapStatus: {
    loading: false,
    error: "",
    updatedAt: "",
    roadmapEngine: "",
    lastGeneratedKey: "",
    progressPercent: 0,
    progressLabel: "",
  },
};

function isLegacyDemoState(savedState) {
  return (
    savedState?.auth?.accountEmail === DEMO_ACCOUNT_EMAIL ||
    savedState?.profile?.email === DEMO_ACCOUNT_EMAIL ||
    savedState?.profile?.fullName === "Justine Alonzo"
  );
}

function buildPersistedProfile(profile) {
  if (!profile) return defaultState.profile;

  return {
    ...profile,
    resumeText: "",
  };
}

function buildPersistedState(state) {
  return {
    theme: state.theme,
    activeSidebar: state.activeSidebar,
    activeCategory: state.activeCategory,
    subscription: state.subscription,
    applicationsTab: state.applicationsTab,
    expandedApplicationId: state.expandedApplicationId,
    trainingTab: state.trainingTab,
    progressTab: state.progressTab,
    expandedRoadmapId: state.expandedRoadmapId,
    profilePanelOpen: state.profilePanelOpen,
    profilePanelTab: state.profilePanelTab,
    selectedJobId: state.selectedJobId,
    selectedAdminUserId: state.selectedAdminUserId,
    selectedAdminCertificationId: state.selectedAdminCertificationId,
    adminUserActionId: state.adminUserActionId,
    authModalOpen: state.authModalOpen,
    authMode: state.authMode,
    mentorshipApplied: state.mentorshipApplied,
    certificationFilter: state.certificationFilter,
    certificationPractice: state.certificationPractice,
    certificationPortalVisits: state.certificationPortalVisits,
    profileSavedAt: state.profileSavedAt,
    auth: {
      ...state.auth,
      password: "",
    },
    profile: buildPersistedProfile(state.profile),
    applications: state.applications,
    saved: state.saved,
    profileExperience: state.profileExperience,
    profileCertificates: state.profileCertificates,
    volunteerActivities: state.volunteerActivities,
    careerRoadmaps: state.careerRoadmaps,
    community: state.community,
    supportMessages: state.supportMessages,
    roadmapStatus: {
      ...state.roadmapStatus,
      loading: false,
      progressPercent: 0,
      progressLabel: "",
    },
  };
}

function loadSavedState() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultState;

  try {
    const parsed = JSON.parse(saved);

    if (isLegacyDemoState(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return defaultState;
    }

    return {
      ...defaultState,
      ...parsed,
      activeSidebar: parsed.activeSidebar === "training" && parsed.trainingTab === "community"
        ? "community"
        : legacyTrainingPages.includes(parsed.activeSidebar) ? "training" : parsed.activeSidebar,
      trainingTab: legacyTrainingPages.includes(parsed.activeSidebar)
        ? parsed.activeSidebar
        : trainingTabs.some((tab) => tab.id === parsed.trainingTab) ? parsed.trainingTab : defaultState.trainingTab,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return defaultState;
  }
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

function setPendingOauthRole(role) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_OAUTH_ROLE_KEY, normalizePublicSignupRole(role));
}

function consumePendingOauthRole() {
  if (typeof window === "undefined") return null;
  const role = window.localStorage.getItem(PENDING_OAUTH_ROLE_KEY);
  window.localStorage.removeItem(PENDING_OAUTH_ROLE_KEY);
  return role ? normalizePublicSignupRole(role) : null;
}

async function persistProfileRecord(accountId, profile) {
  if (!hasSupabaseConfig || !supabase || !accountId) return;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: accountId,
        ...createProfileUpdatePayload(profile),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message || "Unable to save your profile.");
  }
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

function formatCommunityTime(value) {
  if (!value) return "Now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCommunityExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeCommunitySlug(value, fallback = "general") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 36);

  return slug || fallback;
}

function normalizeDiscordInviteUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const withProtocol = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowedHosts = new Set(["discord.gg", "discord.com", "discordapp.com"]);

    if (!allowedHosts.has(host)) return "";
    if (!url.pathname.includes("/invite/") && host !== "discord.gg") return "";

    return url.toString();
  } catch {
    return "";
  }
}

function getCommunityErrorMessage(error, fallback) {
  const message = error?.message || "";

  if (message.includes("invite_url")) {
    return "Discord invite links need the latest Community migration. Server creation can continue without the invite link until that column is applied.";
  }

  if (message.includes("expires_at")) {
    return "Community post expiration needs the latest migration. Apply the expiring posts migration, then reload the app.";
  }

  if (message.includes("schema cache") || message.includes("community_")) {
    return "Community database tables are not available yet. Apply the latest Supabase migration, then reload the app.";
  }

  return `${fallback}: ${message || "Unknown error"}`;
}

function buildCommunityFromRecords({
  servers = [],
  memberships = [],
  channels = [],
  messages = [],
  posts = [],
  reactions = [],
  comments = [],
  currentUserId = "",
  previousCommunity = defaultState.community,
}) {
  const joinedServerIds = memberships.map((membership) => membership.server_id);
  const reactionCounts = reactions.reduce((counts, reaction) => {
    counts[reaction.post_id] = (counts[reaction.post_id] ?? 0) + 1;
    return counts;
  }, {});
  const likedPostIds = new Set(reactions.filter((reaction) => reaction.user_id === currentUserId).map((reaction) => reaction.post_id));
  const commentsByPostId = comments.reduce((grouped, comment) => {
    grouped[comment.post_id] = grouped[comment.post_id] ?? [];
    grouped[comment.post_id].push({
      id: comment.id,
      authorId: comment.author_id || "",
      author: comment.author_name || "SkillBridge User",
      role: comment.author_role || "Applicant",
      text: comment.body || "",
      time: formatCommunityTime(comment.created_at),
      expiresAt: comment.expires_at || "",
    });
    return grouped;
  }, {});
  const messagesByChannelId = messages.reduce((grouped, message) => {
    grouped[message.channel_id] = grouped[message.channel_id] ?? [];
    grouped[message.channel_id].push({
      id: message.id,
      authorId: message.author_id || "",
      author: message.author_name || "SkillBridge User",
      role: message.author_role || "Applicant",
      text: message.body || "",
      time: formatCommunityTime(message.created_at),
    });
    return grouped;
  }, {});
  const postsByServerId = posts.reduce((grouped, post) => {
    grouped[post.server_id] = grouped[post.server_id] ?? [];
    grouped[post.server_id].push({
      id: post.id,
      authorId: post.author_id || "",
      author: post.author_name || "SkillBridge User",
      role: post.author_role || "Applicant",
      text: post.body || "",
      likes: reactionCounts[post.id] ?? 0,
      likedByMe: likedPostIds.has(post.id),
      comments: commentsByPostId[post.id] ?? [],
      time: formatCommunityTime(post.created_at),
      expiresAt: post.expires_at || "",
    });
    return grouped;
  }, {});
  const channelsByServerId = channels.reduce((grouped, channel) => {
    grouped[channel.server_id] = grouped[channel.server_id] ?? [];
    grouped[channel.server_id].push({
      id: channel.id,
      createdBy: channel.created_by || "",
      name: channel.name || "general",
      topic: channel.topic || "",
      messages: messagesByChannelId[channel.id] ?? [],
    });
    return grouped;
  }, {});
  const mappedServers = servers.map((server) => ({
    id: server.id,
    ownerId: server.owner_id || "",
    name: server.name || "Community Server",
    description: server.description || "",
    inviteUrl: server.invite_url || "",
    members: memberships.filter((membership) => membership.server_id === server.id).length,
    joined: joinedServerIds.includes(server.id),
    channels: channelsByServerId[server.id] ?? [],
    posts: postsByServerId[server.id] ?? [],
  }));
  const activeServerId = mappedServers.some((server) => server.id === previousCommunity.activeServerId)
    ? previousCommunity.activeServerId
    : mappedServers[0]?.id || "";
  const activeServer = mappedServers.find((server) => server.id === activeServerId);
  const activeChannelId = activeServer?.channels.some((channel) => channel.id === previousCommunity.activeChannelId)
    ? previousCommunity.activeChannelId
    : activeServer?.channels[0]?.id || "";

  return {
    ...previousCommunity,
    servers: mappedServers,
    joinedServerIds,
    activeServerId,
    activeChannelId,
    activeChatChannelId: previousCommunity.activeChatChannelId || "",
    loading: false,
    error: "",
  };
}

function App() {
  const [state, setState] = useState(loadSavedState);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState("");
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  const [activeRoadmapIndex, setActiveRoadmapIndex] = useState(0);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "Applicant" });
  const [authFeedback, setAuthFeedback] = useState("");
  const [roadmapGenerationRequestId, setRoadmapGenerationRequestId] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [activePracticeTest, setActivePracticeTest] = useState(null);
  const latestRoadmapRequestKeyRef = useRef("");
  const [announcementForm, setAnnouncementForm] = useState({
    tag: "Update",
    label: "Announcement",
    title: "",
    body: "",
    link: "View update",
    targetCategory: "",
    expirationDate: "",
    bannerName: "",
    bannerUrl: "",
  });
  const [experienceForm, setExperienceForm] = useState({ title: "", company: "", period: "", years: "" });
  const [certificateForm, setCertificateForm] = useState({ title: "", source: "", date: "", photoName: "", photoPreview: "" });
  const [volunteerForm, setVolunteerForm] = useState({ org: "", role: "", status: "Active", last: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [isRenewalNoticeDismissed, setIsRenewalNoticeDismissed] = useState(false);
  const [closingJobModal, setClosingJobModal] = useState(false);
  const [jobNavigationDirection, setJobNavigationDirection] = useState(null);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [supportPanelOpen, setSupportPanelOpen] = useState(false);
  const [communityServerForm, setCommunityServerForm] = useState({ name: "", description: "", inviteUrl: "" });
  const [communityChannelForm, setCommunityChannelForm] = useState({ name: "", topic: "" });
  const [communityMessageDraft, setCommunityMessageDraft] = useState("");
  const [communityPostDraft, setCommunityPostDraft] = useState("");
  const [communityCommentDrafts, setCommunityCommentDrafts] = useState({});
  const [communityEditDialog, setCommunityEditDialog] = useState(null);
  const [communityEditValue, setCommunityEditValue] = useState("");
  const [communityEditFeedback, setCommunityEditFeedback] = useState("");
  const [communityEditSaving, setCommunityEditSaving] = useState(false);
  const [mentorshipSearchQuery, setMentorshipSearchQuery] = useState("");
  const [certificationSearchQuery, setCertificationSearchQuery] = useState("");
  const [communityServerSearchQuery, setCommunityServerSearchQuery] = useState("");
  const [communityChannelSearchQuery, setCommunityChannelSearchQuery] = useState("");
  const [supportMessageDraft, setSupportMessageDraft] = useState("");
  const isAdmin = state.auth.isAuthenticated && state.auth.accountRole === "Admin";
  const isStudent = state.auth.isAuthenticated && state.auth.accountRole === "Student";
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
  const announcementSlides = state.announcements;


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
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedState(state)));
    } catch {
      try {
        const fallbackState = buildPersistedState({
          ...state,
          profile: {
            ...buildPersistedProfile(state.profile),
            aiProfile: null,
          },
        });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackState));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
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
          applications: [],
          applicationStatusById: initialApplicationStatus,
          persistedApplications: [],
          careerRoadmaps: [],
          expandedApplicationId: null,
          expandedRoadmapId: "",
          profileCertificates: [],
          adminCertifications: [],
          roadmapStatus: {
            ...defaultState.roadmapStatus,
          },
        }));
        return;
      }

      setAuthFeedback("");

      const { data: profileRecord, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setAuthFeedback(`Profile reload failed: ${profileError.message}`);
        return;
      }

      if (profileRecord?.status === "Suspended") {
        await handleSuspendedAccount(profileRecord.email || session.user.email || "");
        return;
      }

      const pendingOauthRole = !profileRecord ? consumePendingOauthRole() : null;
      const mappedProfile = mapProfileRecordToState(profileRecord, session.user);
      const effectiveRole = profileRecord?.role || pendingOauthRole || mappedProfile.role;

      if (!profileRecord && hasSupabaseConfig && supabase) {
        const fallbackProfile = {
          ...createBaseUserProfile(effectiveRole),
          ...mappedProfile,
          email: session.user.email || mappedProfile.email,
          role: effectiveRole,
        };

        try {
          await persistProfileRecord(session.user.id, fallbackProfile);
        } catch (error) {
          setAuthFeedback(error instanceof Error ? error.message : "Unable to create your profile record.");
        }
      }

      let subscriptionState = {
        status: "free",
        plan: "Free",
        renewalDate: "",
      };

      if (mappedProfile.role !== "Admin") {
        const { data: subscriptionRecord, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("plan,status,renewal_date")
          .eq("user_id", session.user.id)
          .order("renewal_date", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (subscriptionError) {
          setAuthFeedback(`Subscription reload failed: ${subscriptionError.message}`);
        }

        if (subscriptionRecord) {
          subscriptionState = {
            status: subscriptionRecord.status || "free",
            plan: subscriptionRecord.plan || "Applicant Premium",
            renewalDate: subscriptionRecord.renewal_date || "",
          };
        }
      }

      const nextProfile = profileRecord ? mappedProfile : { ...mappedProfile, role: effectiveRole };

      setState((current) => ({
        ...current,
        authModalOpen: false,
        authMode: "login",
        activeSidebar: nextProfile.role === "Admin" ? "analytics" : current.activeSidebar === "analytics" ? "discover" : current.activeSidebar,
        auth: {
          ...current.auth,
          isAuthenticated: true,
          accountId: session.user.id,
          accountName: nextProfile.fullName,
          accountEmail: nextProfile.email,
          accountRole: nextProfile.role,
          password: "",
        },
        subscription: subscriptionState,
        profile: nextProfile,
        profileExperience: Array.isArray(nextProfile.aiProfile?.experience_entries)
          ? nextProfile.aiProfile.experience_entries.map((item, index) => ({
              id: item.id || `${session.user.id}-resume-${index}`,
              title: item.title || "Resume experience",
              company: item.company || "Resume entry",
              period: item.period || "From uploaded resume",
              years: item.years || "Imported",
            }))
          : [],
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
    if (announcementSlides.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveAnnouncement((current) => (current + 1) % announcementSlides.length);
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, [announcementSlides.length]);

  async function refreshCommunityFromSupabase() {
    if (!hasSupabaseConfig || !supabase || !state.auth.accountId || !hasActiveSubscription) return;

    setState((current) => ({
      ...current,
      community: {
        ...(current.community ?? defaultState.community),
        loading: true,
        error: "",
      },
    }));

    const [
      serversResult,
      membershipsResult,
      channelsResult,
      messagesResult,
      postsResult,
      reactionsResult,
      commentsResult,
    ] = await Promise.all([
      supabase.from("community_servers").select("*").order("created_at", { ascending: true }),
      supabase.from("community_server_members").select("*"),
      supabase.from("community_channels").select("*").order("created_at", { ascending: true }),
      supabase.from("community_channel_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("community_posts").select("*").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("created_at", { ascending: false }),
      supabase.from("community_post_reactions").select("*"),
      supabase.from("community_post_comments").select("*").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("created_at", { ascending: true }),
    ]);

    const error =
      serversResult.error ||
      membershipsResult.error ||
      channelsResult.error ||
      messagesResult.error ||
      postsResult.error ||
      reactionsResult.error ||
      commentsResult.error;

    if (error) {
      setState((current) => ({
        ...current,
        community: {
          ...(current.community ?? defaultState.community),
          loading: false,
          error: getCommunityErrorMessage(error, "Community sync failed"),
        },
      }));
      return;
    }

    setState((current) => ({
      ...current,
      community: buildCommunityFromRecords({
        servers: serversResult.data ?? [],
        memberships: membershipsResult.data ?? [],
        channels: channelsResult.data ?? [],
        messages: messagesResult.data ?? [],
        posts: postsResult.data ?? [],
        reactions: reactionsResult.data ?? [],
        comments: commentsResult.data ?? [],
        currentUserId: current.auth.accountId,
        previousCommunity: current.community ?? defaultState.community,
      }),
    }));
  }

  useEffect(() => {
    if (state.activeSidebar !== "community" || !hasActiveSubscription) return undefined;

    refreshCommunityFromSupabase().catch((error) => {
      setState((current) => ({
        ...current,
        community: {
          ...(current.community ?? defaultState.community),
          loading: false,
          error: getCommunityErrorMessage(error, "Community sync failed"),
        },
      }));
    });

    return undefined;
  }, [state.activeSidebar, hasActiveSubscription, state.auth.accountId]);

  useEffect(() => {
    if (activeAnnouncement >= announcementSlides.length && announcementSlides.length > 0) {
      setActiveAnnouncement(0);
    }
  }, [activeAnnouncement, announcementSlides.length]);

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
    if (!hasSupabaseConfig || !supabase) return undefined;

    let cancelled = false;
    loadAnnouncements(cancelled).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !isAdmin) return;

    let cancelled = false;

    loadAdminUsers(cancelled).catch(() => {});
    loadAdminAnnouncements(cancelled).catch(() => {});

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
    if (!hasSupabaseConfig || !supabase || !state.auth.isAuthenticated || !state.auth.accountId) return;

    let cancelled = false;

    supabase
      .from("applications")
      .select("job_id,status,applied_at,status_timeline,matched_skills,skill_gaps,match_score,job:jobs(id,title,company_name,category,location,work_type,description,responsibilities,required_skills,posted_at,source_platform,source_url)")
      .eq("applicant_id", state.auth.accountId)
      .neq("status", "Withdrawn")
      .order("applied_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error) return;

        const rows = data ?? [];
        const applications = rows.map((row) => row.job_id).filter(Boolean);
        const applicationStatusById = rows.reduce(
          (accumulator, row) => ({
            ...accumulator,
            [row.job_id]: mapApplicationRecordToState(row),
          }),
          {},
        );

        setState((current) => ({
          ...current,
          applications,
          applicationStatusById,
          persistedApplications: rows,
          expandedApplicationId:
            current.expandedApplicationId && applications.includes(current.expandedApplicationId)
              ? current.expandedApplicationId
              : applications[0] ?? null,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [state.auth.accountId, state.auth.isAuthenticated]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !state.auth.isAuthenticated || !state.auth.accountId) return;

    let cancelled = false;

    supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("applicant_id", state.auth.accountId)
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          setAuthFeedback(`Saved jobs reload failed: ${error.message}`);
          return;
        }

        setState((current) => ({
          ...current,
          saved: (data ?? []).map((row) => row.job_id).filter(Boolean),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [state.auth.accountId, state.auth.isAuthenticated]);

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

  const visibleCategories = useMemo(
    () => (isStudent ? categories.filter((category) => category.id !== "jobs") : categories),
    [isStudent],
  );

  const listings = useMemo(
    () => {
      const remoteListings = state.liveJobs.map((job, index) => {
        const recommendation = recommendationMap.get(String(job.id));
        const applicantSkills = getApplicantSkills(state.profile);
        const inferredRequiredSkills =
          job.required_skills?.length
            ? job.required_skills
            : extractListingSkills(job.title, job.description, ...(job.responsibilities ?? []));
        const requirementPartition = partitionRequiredSkills(applicantSkills, inferredRequiredSkills);
        const resolvedRequiredSkills = requirementPartition.required;
        const matchedSkills = requirementPartition.matched;
        const skillGaps = requirementPartition.gaps;

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
          sourceUrl: job.application_url || job.source_url,
          aiReason: recommendation?.reason ?? "",
          matchedSkills,
        };
      });

      return remoteListings.map((listing) => {
        const recommendation = recommendationMap.get(String(listing.id));
        const similarity = computeListingSimilarity(listing, state.profile, recommendation);
        const matchedSkills = similarity.matchedSkills;
        const rawMatchedSkills = similarity.rawMatchedSkills;
        const gaps = partitionRequiredSkills(getApplicantSkills(state.profile), listing.requiredSkills).gaps;

        return {
          ...listing,
          score: similarity.score,
          scoreTone: getScoreToneClass(similarity.score),
          aiReason: recommendation?.reason ?? listing.aiReason ?? "",
          matchedSkills,
          gaps,
          rawMatchedSkills: similarity.rawMatchedSkills,
          scoreBreakdown: similarity.scoreBreakdown,
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

  useEffect(() => {
    if (!isStudent) return;
    if (state.activeCategory === "internships" || state.activeCategory === "volunteer") return;

    setState((current) => ({
      ...current,
      activeCategory: "internships",
    }));
  }, [isStudent, state.activeCategory]);

  useEffect(() => {
    if (state.aiStatus.loadingJobs) return;
    if (state.aiStatus.error) return;
    if (listings.length === 0) return;

    const listingIds = new Set(listings.map((listing) => String(listing.id)));
    const applicationIds = new Set(state.applications.map((id) => String(id)));

    setState((current) => {
      const saved = current.saved.filter((id) => listingIds.has(String(id)));
      const selectedJobId = current.selectedJobId && listingIds.has(String(current.selectedJobId)) ? current.selectedJobId : null;
      const expandedApplicationId =
        current.expandedApplicationId && applicationIds.has(String(current.expandedApplicationId)) ? current.expandedApplicationId : null;
      const careerRoadmaps = current.careerRoadmaps.filter((item) => applicationIds.has(String(item.job_id)));
      const expandedRoadmapId =
        current.expandedRoadmapId &&
        careerRoadmaps.some((item) => (item.phases ?? []).some((phase) => `${item.job_id}:${phase.id}` === current.expandedRoadmapId))
          ? current.expandedRoadmapId
          : "";

      if (
        saved.length === current.saved.length &&
        selectedJobId === current.selectedJobId &&
        expandedApplicationId === current.expandedApplicationId &&
        careerRoadmaps.length === current.careerRoadmaps.length &&
        expandedRoadmapId === current.expandedRoadmapId
      ) {
        return current;
      }

      return {
        ...current,
        saved,
        selectedJobId,
        expandedApplicationId,
        careerRoadmaps,
        expandedRoadmapId,
      };
    });
  }, [listings, state.aiStatus.error, state.aiStatus.loadingJobs, state.applications]);

  const counts = useMemo(
    () =>
      visibleCategories.map((category) => ({
        ...category,
        count: rankedListings.filter((listing) => listing.category === category.id).length,
      })),
    [rankedListings, visibleCategories],
  );
  const categoryActiveIndex = Math.max(
    counts.findIndex((item) => item.id === state.activeCategory),
    0,
  );
  const applicationsTabIndex = state.applicationsTab === "saved" ? 1 : 0;
  const trainingTabIndex = Math.max(
    trainingTabs.findIndex((tab) => tab.id === state.trainingTab),
    0,
  );
  const progressTabIndex = Math.max(
    progressTabs.findIndex((tab) => tab.id === state.progressTab),
    0,
  );
  const certificationFilterIndex = Math.max(
    certificationCategories.findIndex((category) => category === state.certificationFilter),
    0,
  );
  const communityServers = state.community?.servers ?? defaultCommunityServers;
  const activeCommunityServer =
    communityServers.find((server) => server.id === state.community?.activeServerId) ??
    communityServers[0];
  const joinedCommunityServerIds = state.community?.joinedServerIds ?? [];
  const communityChannels = activeCommunityServer?.channels ?? [];
  const activeCommunityChannel =
    communityChannels.find((channel) => channel.id === state.community?.activeChannelId) ??
    communityChannels[0];
  const activeChatChannel =
    communityChannels.find((channel) => channel.id === state.community?.activeChatChannelId) ??
    activeCommunityChannel;
  const normalizedMentorshipSearch = mentorshipSearchQuery.trim().toLowerCase();
  const filteredMentorshipCourses = normalizedMentorshipSearch
    ? mentorshipCourses.filter((course) =>
        [
          course.mentor,
          course.role,
          course.title,
          course.description,
          course.duration,
          course.schedule,
          course.start,
          course.price,
          ...(course.badges ?? []),
          ...(course.tags ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedMentorshipSearch),
      )
    : mentorshipCourses;
  const normalizedCertificationSearch = certificationSearchQuery.trim().toLowerCase();
  const normalizedCommunityServerSearch = communityServerSearchQuery.trim().toLowerCase();
  const filteredCommunityServers = normalizedCommunityServerSearch
    ? communityServers.filter((server) =>
        [server.name, server.description, server.inviteUrl]
          .join(" ")
          .toLowerCase()
          .includes(normalizedCommunityServerSearch),
      )
    : communityServers;
  const normalizedCommunityChannelSearch = communityChannelSearchQuery.trim().toLowerCase();
  const filteredCommunityChannels = normalizedCommunityChannelSearch
    ? communityChannels.filter((channel) =>
        [channel.name, channel.topic]
          .join(" ")
          .toLowerCase()
          .includes(normalizedCommunityChannelSearch),
      )
    : communityChannels;
  const currentCommunityAuthor = state.auth.isAuthenticated
    ? state.profile.fullName || state.auth.accountName || "SkillBridge User"
    : "Guest User";
  const currentCommunityRole = state.profile.jobTitle || state.auth.accountRole || "Applicant";

  const appliedCards = useMemo(
    () => {
      const listingById = new Map(listings.map((listing) => [String(listing.id), listing]));
      const persistedById = new Map(state.persistedApplications.map((record) => [String(record.job_id), record]));

      return state.applications
        .map((jobId, index) => {
          const normalizedId = String(jobId);
          const liveListing = listingById.get(normalizedId);

          if (liveListing) {
            return {
              ...liveListing,
              ...(state.applicationStatusById[jobId] ?? createApplicationEntry()),
            };
          }

          const persisted = persistedById.get(normalizedId);
          const job = persisted?.job;

          if (!job) return null;

          const requiredSkills =
            job.required_skills?.length
              ? job.required_skills
              : extractListingSkills(job.title, job.description, ...(job.responsibilities ?? []));

          return {
            id: job.id,
            category: normalizeCategoryForState(job.category),
            company: job.company_name || "External employer",
            title: job.title || "Applied role",
            meta: `${job.work_type || "Flexible"} | ${job.location || "Philippines"} | External listing`,
            overview: job.description || "",
            sourceDescription: job.description || "",
            setup: `${job.category || "Jobs"} | ${job.work_type || "Flexible"} | ${job.source_platform || "External listing"}`,
            responsibilities: job.responsibilities?.length ? job.responsibilities : [],
            sourceResponsibilities: job.responsibilities?.length ? job.responsibilities : [],
            employerNotes: [],
            posted: formatRelativeDate(job.posted_at),
            applicants: Math.max(9, Number(persisted?.match_score ?? 52) - 20),
            requiredSkills,
            scoreBase: Number(persisted?.match_score ?? 72),
            score: Number(persisted?.match_score ?? 72),
            scoreTone: getScoreToneClass(Number(persisted?.match_score ?? 72)),
            gaps: Array.isArray(persisted?.skill_gaps) ? persisted.skill_gaps : [],
            accent: accentSequence[index % accentSequence.length],
            initial: (job.company_name || "E").charAt(0).toUpperCase(),
            sourceUrl: job.source_url || "",
            aiReason: "",
            matchedSkills: Array.isArray(persisted?.matched_skills) ? persisted.matched_skills : [],
            ...(state.applicationStatusById[jobId] ?? mapApplicationRecordToState(persisted)),
          };
        })
        .filter(Boolean);
    },
    [listings, state.applications, state.applicationStatusById, state.persistedApplications],
  );

  const savedCards = useMemo(
    () => listings.filter((listing) => state.saved.includes(listing.id) && !state.applications.includes(listing.id)),
    [listings, state.saved, state.applications],
  );

  const activeApplicationCards = state.applicationsTab === "applied" ? appliedCards : savedCards;
  const appliedCount = appliedCards.length;
  const appliedCardMap = useMemo(() => new Map(appliedCards.map((card) => [String(card.id), card])), [appliedCards]);
  const roadmapCandidateJobs = useMemo(
    () => state.applications.slice(0, 3).map((jobId) => appliedCardMap.get(String(jobId))).filter(Boolean),
    [appliedCardMap, state.applications],
  );
  const roadmapProfileSignature = useMemo(
    () => buildRoadmapProfileSignature(state.profile, roadmapCandidateJobs),
    [roadmapCandidateJobs, state.profile],
  );
  const roadmapCandidateJobIds = useMemo(
    () => roadmapCandidateJobs.map((job) => String(job.id)),
    [roadmapCandidateJobs],
  );
  const roadmapGenerationKey = useMemo(
    () =>
      JSON.stringify({
        jobs: roadmapCandidateJobIds,
        signature: roadmapProfileSignature,
      }),
    [roadmapCandidateJobIds, roadmapProfileSignature],
  );
  const roadmapRequestKey = useMemo(
    () => `${roadmapGenerationKey}:${roadmapGenerationRequestId}`,
    [roadmapGenerationKey, roadmapGenerationRequestId],
  );
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
  const roadmapItems = state.careerRoadmaps.map((roadmap) => ({
    ...roadmap,
    phases: (roadmap.phases ?? []).map((phase) => ({
      ...phase,
      expanded: state.expandedRoadmapId === `${roadmap.job_id}:${phase.id}`,
    })),
  }));
  const activeRoadmap = roadmapItems[activeRoadmapIndex] ?? roadmapItems[0] ?? null;
  const activeRoadmapJobId = activeRoadmap?.job_id ? String(activeRoadmap.job_id) : (roadmapCandidateJobs[0]?.id ? String(roadmapCandidateJobs[0].id) : "");
  useEffect(() => {
    if (roadmapItems.length === 0) {
      setActiveRoadmapIndex(0);
      return;
    }

    if (activeRoadmapIndex >= roadmapItems.length) {
      setActiveRoadmapIndex(roadmapItems.length - 1);
    }
  }, [activeRoadmapIndex, roadmapItems.length]);
  useEffect(() => {
    if (isAdmin || !state.auth.isAuthenticated || !hasActiveSubscription) return;

    const activeRoadmapIds = new Set(roadmapCandidateJobs.map((job) => String(job.id)));

    if (roadmapCandidateJobs.length === 0) {
      setState((current) => {
        const alreadyCleared =
          current.expandedRoadmapId === "" &&
          current.careerRoadmaps.length === 0 &&
          !current.roadmapStatus.loading &&
          current.roadmapStatus.error === "" &&
          current.roadmapStatus.updatedAt === "" &&
          current.roadmapStatus.roadmapEngine === "" &&
          current.roadmapStatus.lastGeneratedKey === "";

        if (alreadyCleared) {
          return current;
        }

        return {
          ...current,
          expandedRoadmapId: "",
          careerRoadmaps: [],
          roadmapStatus: {
            ...current.roadmapStatus,
            loading: false,
            error: "",
            updatedAt: "",
            roadmapEngine: "",
            lastGeneratedKey: "",
            progressPercent: 0,
            progressLabel: "",
          },
        };
      });
      return;
    }

    if (state.roadmapStatus.lastGeneratedKey === roadmapRequestKey && state.roadmapStatus.loading) {
      return;
    }

    if (
      state.roadmapStatus.lastGeneratedKey === roadmapRequestKey &&
      state.careerRoadmaps.length > 0 &&
      state.careerRoadmaps.every((item) => activeRoadmapIds.has(String(item.job_id)))
    ) {
      return;
    }

    let cancelled = false;
    let enhancementTimeoutId = null;
    latestRoadmapRequestKeyRef.current = roadmapRequestKey;
    const isStaleRoadmapRun = () => cancelled || latestRoadmapRequestKeyRef.current !== roadmapRequestKey;

    const roadmapPayload = {
      profile: {
        role: state.profile.role,
        fullName: state.profile.fullName,
        jobTitle: state.profile.jobTitle,
        about: state.profile.about,
        location: state.profile.location,
        skills: state.profile.skills ?? [],
      },
      resumeProfile: state.profile.aiProfile ?? {},
      jobs: roadmapCandidateJobs.map((job) => ({
        id: job.id,
        title: job.title,
        company_name: job.company,
        category: job.category,
        description: job.sourceDescription || job.overview,
        responsibilities: job.sourceResponsibilities ?? job.responsibilities ?? [],
        requiredSkills: job.requiredSkills ?? [],
        matchedSkills: job.matchedSkills ?? [],
        gaps: job.gaps ?? [],
        matchScore: job.score,
      })),
    };
    const immediateRoadmaps = buildCareerRoadmapFallback(roadmapPayload).roadmaps;

    async function loadRoadmapsWithCache() {
      let cachedRows = [];

      if (hasSupabaseConfig && supabase && state.auth.accountId) {
        const { data } = await supabase
          .from("roadmap_items")
          .select("id,title,summary,status,target_month,updated_at")
          .eq("applicant_id", state.auth.accountId)
          .eq("phase_label", "CACHE");

        cachedRows = data ?? [];
      }

      if (cancelled) return;

      const cachedMap = new Map(
        roadmapCandidateJobIds
          .map((jobId) => {
            const cacheTitle = buildRoadmapCacheTitle(jobId, roadmapProfileSignature);
            const row = cachedRows.find((item) => item.title === cacheTitle);
            if (!row) return null;
            return [String(jobId), normalizeCachedRoadmapRecord({ ...row, cacheJobId: jobId }), row];
          })
          .filter(Boolean),
      );
      const activeJob = roadmapPayload.jobs.find((job) => String(job.id) === activeRoadmapJobId) ?? roadmapPayload.jobs[0] ?? null;
      const shouldGenerateMissingJobs = roadmapGenerationRequestId > 0;
      const activeJobId = activeJob ? String(activeJob.id) : "";
      const shouldRefreshActiveJob = shouldGenerateMissingJobs && Boolean(activeJobId);
      const missingJobs = activeJob && (!cachedMap.has(activeJobId) || shouldRefreshActiveJob) ? [activeJob] : [];
      const fallbackByJobId = new Map(immediateRoadmaps.map((roadmap) => [String(roadmap.job_id), roadmap]));
      const immediateMergedRoadmaps = roadmapCandidateJobIds
        .map((jobId) => cachedMap.get(String(jobId))?.[0] ?? fallbackByJobId.get(String(jobId)))
        .filter(Boolean);
      const latestCachedAt = cachedRows
        .map((row) => row.updated_at)
        .filter(Boolean)
        .sort()
        .at(-1);
      const hasCachedAiRoadmap = cachedRows.some((row) => row.status && row.status !== "Planned");
      const generationTotal = missingJobs.length > 0 ? 1 : activeJob ? 1 : 0;
      const cachedCount = activeJob && cachedMap.has(activeJobId) && !shouldRefreshActiveJob ? 1 : 0;
      const initialProgress = buildRoadmapProgress(cachedCount, generationTotal);

      setState((current) => ({
        ...current,
        careerRoadmaps: immediateMergedRoadmaps,
          roadmapStatus: {
            ...current.roadmapStatus,
            loading: shouldGenerateMissingJobs && missingJobs.length > 0,
            error: "",
            updatedAt: latestCachedAt || new Date().toISOString(),
            roadmapEngine: hasCachedAiRoadmap ? "ai-structured-output" : "local-fallback",
            lastGeneratedKey: roadmapRequestKey,
            progressPercent:
              !shouldGenerateMissingJobs && cachedRows.length === 0
                ? 0
                : missingJobs.length > 0
                  ? initialProgress.progressPercent
                  : 100,
            progressLabel:
              !shouldGenerateMissingJobs && cachedRows.length === 0
                ? ""
                : missingJobs.length > 0
                  ? initialProgress.progressLabel
                  : generationTotal > 0
                    ? `${generationTotal}/${generationTotal} roadmap enhanced`
                    : "",
          },
        }));

      if (missingJobs.length === 0 || !shouldGenerateMissingJobs) {
        return;
      }

      enhancementTimeoutId = window.setTimeout(() => {
        if (isStaleRoadmapRun()) return;

        setState((current) => {
          if (isStaleRoadmapRun()) return current;

          return {
            ...current,
            roadmapStatus: {
              ...current.roadmapStatus,
              loading: false,
              error: "AI roadmap enhancement took too long. The local roadmap is still available below. Try again in a moment.",
            },
          };
        });
      }, ROADMAP_ENHANCEMENT_TIMEOUT_MS);

      const results = [];

      for (const job of missingJobs) {
        if (cancelled) break;

        try {
          const result = await fetchCareerRoadmaps({
            ...roadmapPayload,
            jobs: [job],
          });

          results.push({ status: "fulfilled", value: result, jobId: job.id });
          if (cancelled) break;

          const generatedRoadmap = result.roadmaps?.[0];
          if (generatedRoadmap) {
            const taggedRoadmap = {
              ...generatedRoadmap,
              _source: result.usedFallback ? "local-fallback" : "ai-enhanced",
            };
            if (hasSupabaseConfig && supabase && state.auth.accountId && !result.usedFallback) {
              const cacheTitle = buildRoadmapCacheTitle(job.id, roadmapProfileSignature);
              const existingCacheRow = cachedRows.find((row) => row.title === cacheTitle);
              const cachePayload = {
                applicant_id: state.auth.accountId,
                phase_label: "CACHE",
                title: cacheTitle,
                summary: JSON.stringify({
                  ...taggedRoadmap,
                  _source: "ai-enhanced",
                }),
                skills: [],
                actions: [],
                sort_order: 0,
                status: "Active",
                target_month: result.updatedAt || new Date().toISOString(),
              };

              if (existingCacheRow?.id) {
                await supabase.from("roadmap_items").update(cachePayload).eq("id", existingCacheRow.id);
              } else {
                const { data: insertedCache } = await supabase
                  .from("roadmap_items")
                  .insert(cachePayload)
                  .select("id,title,summary,status,target_month,updated_at")
                  .maybeSingle();

                if (insertedCache) {
                  cachedRows.push(insertedCache);
                }
              }
            }

            setState((current) => {
              if (isStaleRoadmapRun()) return current;

              const nextRoadmaps = current.careerRoadmaps
                .map((roadmap) => (String(roadmap.job_id) === String(taggedRoadmap.job_id) ? taggedRoadmap : roadmap))
                .filter(Boolean);
              const completedProgress = buildRoadmapProgress(cachedCount + results.length, generationTotal);

              return {
                ...current,
                careerRoadmaps: nextRoadmaps,
                roadmapStatus: {
                  ...current.roadmapStatus,
                  updatedAt: result.updatedAt || new Date().toISOString(),
                  roadmapEngine: result.usedFallback ? current.roadmapStatus.roadmapEngine : (result.roadmapEngine || "ai-structured-output"),
                  progressPercent: completedProgress.progressPercent,
                  progressLabel: completedProgress.progressLabel,
                },
              };
            });
          }
        } catch (error) {
          results.push({ status: "rejected", reason: error, jobId: job.id });
          setState((current) => {
            if (isStaleRoadmapRun()) return current;

            const completedProgress = buildRoadmapProgress(cachedCount + results.length, generationTotal);
            return {
              ...current,
              roadmapStatus: {
                ...current.roadmapStatus,
                progressPercent: completedProgress.progressPercent,
                progressLabel: completedProgress.progressLabel,
              },
            };
          });
        }
      }

      if (cancelled) return;
      if (enhancementTimeoutId) {
        window.clearTimeout(enhancementTimeoutId);
        enhancementTimeoutId = null;
      }

      const failures = results
        .filter((result) => result.status === "rejected" || result.value?.fallbackError)
        .map((result) => (result.status === "rejected" ? result.reason?.message : result.value.fallbackError))
        .filter(Boolean);
      const hasAiRoadmap = hasCachedAiRoadmap || results.some(
        (result) => result.status === "fulfilled" && !result.value?.usedFallback && result.value?.roadmaps?.length > 0,
      );

      setState((current) => {
        if (isStaleRoadmapRun()) return current;

        return {
          ...current,
          roadmapStatus: {
            ...current.roadmapStatus,
            loading: false,
            error: failures.length > 0 ? `Some roadmaps used the local version: ${failures[0]}` : "",
            updatedAt: new Date().toISOString(),
            roadmapEngine: hasAiRoadmap ? "ai-structured-output" : "local-fallback",
            progressPercent: 100,
            progressLabel: generationTotal > 0 ? `${generationTotal}/${generationTotal} roadmap enhanced` : "",
          },
        };
      });
    }
    loadRoadmapsWithCache().catch((error) => {
      if (cancelled) return;
      if (enhancementTimeoutId) {
        window.clearTimeout(enhancementTimeoutId);
        enhancementTimeoutId = null;
      }

      setState((current) => ({
        ...current,
        careerRoadmaps: immediateRoadmaps,
        roadmapStatus: {
          ...current.roadmapStatus,
          loading: false,
          error: error.message || "Failed to load cached roadmaps.",
          updatedAt: new Date().toISOString(),
          roadmapEngine: "local-fallback",
          lastGeneratedKey: roadmapRequestKey,
          progressPercent: 0,
          progressLabel: "",
        },
      }));
    });

    return () => {
      cancelled = true;
      if (enhancementTimeoutId) {
        window.clearTimeout(enhancementTimeoutId);
      }
    };
  }, [
    hasActiveSubscription,
    hasSupabaseConfig,
    isAdmin,
    roadmapCandidateJobIds,
    roadmapCandidateJobs,
    roadmapGenerationKey,
    roadmapGenerationRequestId,
    roadmapRequestKey,
    roadmapProfileSignature,
    state.auth.accountId,
    state.auth.isAuthenticated,
  ]);
  const filteredCertifications = certifications.filter((item) => {
    const matchesCategory = state.certificationFilter === "All" || item.track === state.certificationFilter;
    const matchesSearch =
      !normalizedCertificationSearch ||
      [
        item.title,
        item.subtitle,
        item.provider,
        item.level,
        item.track,
        item.description,
        ...(item.tags ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedCertificationSearch);

    return matchesCategory && matchesSearch;
  });
  const selectedJob = listings.find((listing) => listing.id === state.selectedJobId) ?? null;
  const selectedCategoryRankedListings = selectedJob
    ? rankedListings.filter((listing) => listing.category === selectedJob.category)
    : [];
  const selectedRankedJobIndex = selectedJob
    ? selectedCategoryRankedListings.findIndex((listing) => String(listing.id) === String(selectedJob.id))
    : -1;
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
  const sidebarActiveIndex = Math.max(
    currentSidebarItems.findIndex((item) => item.id === state.activeSidebar),
    0,
  );
  const profileTabs = isAdmin ? adminProfileTabs : applicantProfileTabs;
  const profileTabIndex = Math.max(
    profileTabs.findIndex((tab) => tab.id === state.profilePanelTab),
    0,
  );
  const authSwitchIndex = state.authMode === "signup" ? 1 : 0;
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
    liveContent: state.adminAnnouncements.filter((item) => item.isActive).length,
  };

  useEffect(() => {
    if (!legacyTrainingPages.includes(state.activeSidebar)) return;

    setState((current) => ({
      ...current,
      activeSidebar: "training",
      trainingTab: current.activeSidebar,
    }));
  }, [state.activeSidebar]);

  useEffect(() => {
    if (trainingTabs.some((tab) => tab.id === state.trainingTab)) return;

    setState((current) => ({
      ...current,
      trainingTab: "progress",
    }));
  }, [state.trainingTab]);

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

  async function persistApplicationRecord(jobId, patch = {}) {
    if (!hasSupabaseConfig || !supabase || !state.auth.isAuthenticated || !state.auth.accountId) return;

    const currentEntry = state.applicationStatusById[jobId] ?? createApplicationEntry();
    const listing = listings.find((item) => String(item.id) === String(jobId));

    const payload = {
      applicant_id: state.auth.accountId,
      job_id: jobId,
      status: patch.status || currentEntry.status || "Applied",
      applied_at: patch.applied_at || new Date().toISOString(),
      status_timeline: patch.status_timeline || currentEntry.stageDates || createApplicationEntry().stageDates,
      match_score: Number(patch.match_score ?? listing?.score ?? 0),
      matched_skills: patch.matched_skills || listing?.matchedSkills || [],
      skill_gaps: patch.skill_gaps || listing?.gaps || [],
    };

    const { error } = await supabase.from("applications").upsert(payload, {
      onConflict: "job_id,applicant_id",
    });

    if (error) {
      throw new Error(error.message || "Failed to save the application.");
    }
  }

  async function clearCachedRoadmaps(options = {}) {
    if (!hasSupabaseConfig || !supabase || !state.auth.isAuthenticated || !state.auth.accountId) return;

    const { data } = await supabase
      .from("roadmap_items")
      .select("id,title")
      .eq("applicant_id", state.auth.accountId)
      .eq("phase_label", "CACHE");

    const matchingIds = (data ?? [])
      .filter((item) => {
        if (!options.jobId) {
          return String(item.title || "").startsWith("job-cache:");
        }

        return String(item.title || "").startsWith(`job-cache:${options.jobId}:`);
      })
      .map((item) => item.id);

    if (matchingIds.length === 0) return;

    await supabase.from("roadmap_items").delete().in("id", matchingIds);
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

    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");

      if (error) {
        let message = error.message || "Unable to load the registered users.";

        if (error.context instanceof Response) {
          try {
            const responseBody = await error.context.text();
            if (responseBody) {
              try {
                const parsed = JSON.parse(responseBody);
                message = parsed?.error || parsed?.message || responseBody;
              } catch {
                message = responseBody;
              }
            }
          } catch {
            // Keep the generic message if the response body cannot be read.
          }
        }

        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error || "Unable to load the registered users.");
      }

      if (cancelled) return;
      setState((current) => ({
        ...current,
        adminUsers: (Array.isArray(data?.users) ? data.users : []).map(mapAdminUserRecord),
      }));
      setAuthFeedback("");
    } catch (functionError) {
      if (cancelled) return;
      setAuthFeedback(functionError instanceof Error ? functionError.message : "Unable to load the registered users.");
    }
  }

  async function loadAnnouncements(cancelled = false) {
    if (!hasSupabaseConfig || !supabase) return;

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (cancelled) return;

    if (error) {
      setAuthFeedback(error.message || "Unable to load announcements.");
      return;
    }

    const now = Date.now();
    const activeAnnouncements = (data ?? []).filter((item) => {
      const startsAt = item.starts_at ? new Date(item.starts_at).getTime() : null;
      const endsAt = item.ends_at ? new Date(item.ends_at).getTime() : null;

      if (startsAt && !Number.isNaN(startsAt) && startsAt > now) return false;
      if (endsAt && !Number.isNaN(endsAt) && endsAt < now) return false;
      return true;
    });

    setState((current) => ({
      ...current,
      announcements: activeAnnouncements.map(mapAnnouncementRecord),
    }));
  }

  async function loadAdminAnnouncements(cancelled = false) {
    if (!hasSupabaseConfig || !supabase || !isAdmin) return;

    const { data, error } = await supabase.functions.invoke("admin-manage-announcements", {
      body: { action: "list" },
    });

    if (cancelled) return;

    if (error) {
      setAuthFeedback(error.message || "Unable to load admin announcements.");
      return;
    }

    if (data?.error) {
      setAuthFeedback(data.error || "Unable to load admin announcements.");
      return;
    }

    setState((current) => ({
      ...current,
      adminAnnouncements: (Array.isArray(data?.announcements) ? data.announcements : []).map(mapAnnouncementRecord),
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

  async function handleAnnouncementBannerChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAuthFeedback("Upload an image file for the announcement banner.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAuthFeedback("Announcement banners must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const bannerUrl = await readFileAsDataUrl(file);
      setAnnouncementForm((current) => ({
        ...current,
        bannerName: file.name,
        bannerUrl,
      }));
      setAuthFeedback("");
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : "Unable to load the announcement banner.");
    } finally {
      event.target.value = "";
    }
  }

  async function createAnnouncement() {
    if (!isAdmin) {
      setAuthFeedback("Only admins can publish announcements.");
      return;
    }

    if (!hasSupabaseConfig || !supabase) {
      setAuthFeedback("Supabase is not configured.");
      return;
    }

    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      setAuthFeedback("Announcement title and message are required.");
      return;
    }

    const payload = {
      tag: announcementForm.tag.trim() || null,
      label: announcementForm.label.trim() || null,
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      link_label: announcementForm.link.trim() || null,
      target_page: "discover",
      target_category: announcementForm.targetCategory || null,
      is_active: true,
      display_order: state.adminAnnouncements.length,
      ends_at: announcementForm.expirationDate ? new Date(`${announcementForm.expirationDate}T23:59:59`).toISOString() : null,
      link_target: announcementForm.bannerUrl || null,
    };

    const { data, error } = await supabase.functions.invoke("admin-manage-announcements", {
      body: {
        action: "create",
        payload,
      },
    });

    if (error) {
      setAuthFeedback(error.message || "Unable to create the announcement.");
      return;
    }

    if (data?.error) {
      setAuthFeedback(data.error || "Unable to create the announcement.");
      return;
    }

    setAnnouncementForm({
      tag: "Update",
      label: "Announcement",
      title: "",
      body: "",
      link: "View update",
      targetCategory: "",
      expirationDate: "",
      bannerName: "",
      bannerUrl: "",
    });
    setAuthFeedback("Announcement published successfully.");
    await loadAnnouncements();
    await loadAdminAnnouncements();
  }

  async function toggleAnnouncementActive(announcementId, nextActive) {
    if (!isAdmin || !hasSupabaseConfig || !supabase) return;

    const { data, error } = await supabase.functions.invoke("admin-manage-announcements", {
      body: {
        action: "toggle",
        announcementId,
        nextActive,
      },
    });

    if (error) {
      setAuthFeedback(error.message || "Unable to update the announcement.");
      return;
    }

    if (data?.error) {
      setAuthFeedback(data.error || "Unable to update the announcement.");
      return;
    }

    setAuthFeedback(nextActive ? "Announcement published successfully." : "Announcement removed from the carousel.");
    await loadAnnouncements();
    await loadAdminAnnouncements();
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
          recommendationModel: current.aiStatus.recommendationModel,
          semanticCandidates: current.aiStatus.semanticCandidates,
          lastAutoRecommendationKey: autoKey || current.aiStatus.lastAutoRecommendationKey,
        },
      }));

    try {
      const recommendationCategory =
        (options.roleOverride ?? profile.role) === "Student"
          ? mapStateCategoryToDbCategory(options.categoryOverride ?? state.activeCategory)
          : null;

      const response = await fetchRecommendedJobs({
        profile: {
          fullName: profile.fullName,
          jobTitle: profile.jobTitle,
          location: profile.location,
          about: profile.about,
          skills: profile.skills,
        },
        resumeProfile: aiProfile ?? {},
        category: recommendationCategory,
      });

      setState((current) => ({
        ...current,
        aiRecommendations: response.recommendations ?? [],
        aiStatus: {
          ...current.aiStatus,
          refreshingRecommendations: false,
          error: response.fallbackError
            ? `AI matching fell back to local ranking: ${response.fallbackError}`
            : "",
          recommendationModel: response.model || "",
          semanticCandidates: Number(response.semantic_candidates ?? 0),
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
    const updateTheme = () => {
      setState((current) => ({
        ...current,
        theme: current.theme === "dark" ? "light" : "dark",
      }));
    };

    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateTheme();
      return;
    }

    document.startViewTransition(() => {
      flushSync(updateTheme);
    });
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
      role: mode === "signup" ? normalizePublicSignupRole(state.auth.accountRole) : "Applicant",
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

  async function continueWithGoogle() {
    if (!hasSupabaseConfig || !supabase) {
      setAuthFeedback("Google sign-in requires Supabase to be configured.");
      return;
    }

    const selectedRole = state.authMode === "signup" ? normalizePublicSignupRole(authForm.role) : "Applicant";
    setPendingOauthRole(selectedRole);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setAuthFeedback(error.message || "Unable to continue with Google.");
    }
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

  function applyToJob(jobOrId) {
    const jobId = typeof jobOrId === "object" ? jobOrId.id : jobOrId;
    const listing = typeof jobOrId === "object" ? jobOrId : listings.find((item) => item.id === jobId);
    const externalUrl = listing?.sourceUrl;
    const shouldAnimateModalClose = state.selectedJobId === jobId;
    const optimisticEntry = createApplicationEntry("Applied");

    if (!state.auth.isAuthenticated) {
      openAuthModal("signup");
      return;
    }

    if (shouldAnimateModalClose) {
      setClosingJobModal(true);
    }

    setState((current) => ({
      ...current,
      activeSidebar: "applications",
      applicationsTab: "applied",
      expandedApplicationId: jobId,
      selectedJobId: shouldAnimateModalClose ? current.selectedJobId : null,
      applications: current.applications.includes(jobId) ? current.applications : [...current.applications, jobId],
      saved: current.saved.filter((id) => id !== jobId),
      applicationStatusById: current.applicationStatusById[jobId]
        ? current.applicationStatusById
        : {
            ...current.applicationStatusById,
            [jobId]: optimisticEntry,
          },
      persistedApplications: current.persistedApplications.some((record) => String(record.job_id) === String(jobId))
        ? current.persistedApplications
        : listing
          ? [
              ...current.persistedApplications,
              {
                job_id: jobId,
                status: "Applied",
                applied_at: new Date().toISOString(),
                status_timeline: optimisticEntry.stageDates,
                matched_skills: listing.matchedSkills ?? [],
                skill_gaps: listing.gaps ?? [],
                match_score: Number(listing.score ?? 0),
                job: {
                  id: listing.id,
                  title: listing.title,
                  company_name: listing.company,
                  category: listing.category,
                  location: listing.meta?.split("|")?.[1]?.trim() || "",
                  work_type: listing.meta?.split("|")?.[0]?.trim() || "",
                  description: listing.sourceDescription || listing.overview || "",
                  responsibilities: listing.sourceResponsibilities ?? listing.responsibilities ?? [],
                  required_skills: listing.requiredSkills ?? [],
                  posted_at: null,
                  source_platform: "External listing",
                  source_url: listing.sourceUrl || "",
                },
              },
            ]
          : current.persistedApplications,
    }));

    persistApplicationRecord(jobId, {
      status: "Applied",
      applied_at: new Date().toISOString(),
      status_timeline: optimisticEntry.stageDates,
      match_score: Number(listing?.score ?? 0),
      matched_skills: listing?.matchedSkills ?? [],
      skill_gaps: listing?.gaps ?? [],
    }).catch(() => {});

    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }

    if (shouldAnimateModalClose) {
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          selectedJobId: null,
        }));
        setClosingJobModal(false);
      }, 220);
    }
  }

  async function toggleSave(jobId) {
    if (!state.auth.isAuthenticated) {
      openAuthModal("login");
      return;
    }

    const shouldRemove = state.saved.includes(jobId);

    setState((current) => ({
      ...current,
      saved: shouldRemove
        ? current.saved.filter((id) => id !== jobId)
        : [...current.saved, jobId],
    }));

    if (!hasSupabaseConfig || !supabase || !state.auth.accountId) return;

    const request = shouldRemove
      ? supabase
          .from("saved_jobs")
          .delete()
          .eq("applicant_id", state.auth.accountId)
          .eq("job_id", jobId)
      : supabase
          .from("saved_jobs")
          .upsert(
            {
              applicant_id: state.auth.accountId,
              job_id: jobId,
            },
            { onConflict: "applicant_id,job_id" },
          );
    const { error } = await request;

    if (error) {
      setState((current) => ({
        ...current,
        saved: shouldRemove
          ? [...new Set([...current.saved, jobId])]
          : current.saved.filter((id) => id !== jobId),
      }));
      setAuthFeedback(`Saved job update failed: ${error.message}`);
    }
  }

  function openJobDetails(jobId) {
    setClosingJobModal(false);
    setJobNavigationDirection(null);
    setState((current) => ({
      ...current,
      selectedJobId: jobId,
    }));
  }

  function navigateJobDetails(offset) {
    const nextJob = selectedCategoryRankedListings[selectedRankedJobIndex + offset];
    if (!nextJob) return;

    setJobNavigationDirection(offset > 0 ? "next" : "previous");
    setState((current) => ({
      ...current,
      selectedJobId: nextJob.id,
    }));
  }

  function closeJobDetails() {
    if (!state.selectedJobId || closingJobModal) return;

    setClosingJobModal(true);
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        selectedJobId: null,
      }));
      setClosingJobModal(false);
    }, 220);
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

    const currentEntry = state.applicationStatusById[jobId] ?? createApplicationEntry();
    const currentIndex = applicationStages.indexOf(currentEntry.status);
    const nextIndex = Math.min(currentIndex + 1, applicationStages.length - 1);
    const stageDates = [...currentEntry.stageDates];

    if (!stageDates[nextIndex]) {
      stageDates[nextIndex] = getTodayShortDate();
    }

    persistApplicationRecord(jobId, {
      status: applicationStages[nextIndex],
      status_timeline: stageDates,
    }).catch(() => {});
  }

  function withdrawApplication(jobId) {
    setState((current) => {
      const nextApplicationStatusById = { ...current.applicationStatusById };
      delete nextApplicationStatusById[jobId];

      return {
        ...current,
        applications: current.applications.filter((id) => id !== jobId),
        applicationStatusById: nextApplicationStatusById,
        persistedApplications: current.persistedApplications.filter((record) => String(record.job_id) !== String(jobId)),
        expandedApplicationId: current.expandedApplicationId === jobId ? null : current.expandedApplicationId,
        careerRoadmaps: current.careerRoadmaps.filter((item) => String(item.job_id) !== String(jobId)),
        expandedRoadmapId: String(current.expandedRoadmapId || "").startsWith(`${jobId}:`) ? "" : current.expandedRoadmapId,
        roadmapStatus:
          current.applications.filter((id) => id !== jobId).length === 0
            ? {
                ...current.roadmapStatus,
                loading: false,
                error: "",
                updatedAt: "",
                roadmapEngine: "",
                lastGeneratedKey: "",
                progressPercent: 0,
                progressLabel: "",
              }
            : current.roadmapStatus,
      };
    });

    const currentEntry = state.applicationStatusById[jobId] ?? createApplicationEntry();
    persistApplicationRecord(jobId, {
      status: "Withdrawn",
      status_timeline: currentEntry.stageDates,
    })
      .then(() => clearCachedRoadmaps({ jobId }))
      .catch(() => {});
  }

  function retryCareerRoadmaps() {
    setState((current) => ({
      ...current,
      roadmapStatus: {
        ...current.roadmapStatus,
        loading: false,
        error: "",
        lastGeneratedKey: "",
        progressPercent: 0,
        progressLabel: "",
      },
    }));
    setRoadmapGenerationRequestId((current) => current + 1);
  }

  function requestCareerRoadmaps() {
    setState((current) => ({
      ...current,
      roadmapStatus: {
        ...current.roadmapStatus,
        error: "",
        loading: false,
        lastGeneratedKey: "",
        progressPercent: 0,
        progressLabel: "",
      },
    }));
    setRoadmapGenerationRequestId((current) => current + 1);
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

  function updateCommunity(updater) {
    setState((current) => ({
      ...current,
      community: updater(current.community ?? defaultState.community),
    }));
  }

  function setCommunityError(message) {
    setState((current) => ({
      ...current,
      community: { ...(current.community ?? defaultState.community), error: message },
    }));
  }

  function openCommunityEditDialog(config) {
    setCommunityEditDialog(config);
    setCommunityEditValue(config.value || "");
    setCommunityEditFeedback("");
  }

  function closeCommunityEditDialog() {
    if (communityEditSaving) return;
    setCommunityEditDialog(null);
    setCommunityEditValue("");
    setCommunityEditFeedback("");
  }

  async function saveCommunityEdit(event) {
    event.preventDefault();
    if (!communityEditDialog) return;

    const body = communityEditValue.trim();
    if (!body) {
      setCommunityEditFeedback("Add some text before saving.");
      return;
    }

    const { type, id, serverId, channelId, postId, commentId, messageId } = communityEditDialog;
    setCommunityEditSaving(true);
    setCommunityEditFeedback("");

    if (hasSupabaseConfig && supabase && hasActiveSubscription) {
      const updateByType = {
        server: () => supabase.from("community_servers").update({ description: body }).eq("id", id),
        channel: () => supabase.from("community_channels").update({ topic: body }).eq("id", id),
        post: () => supabase.from("community_posts").update({ body }).eq("id", id),
        comment: () => supabase.from("community_post_comments").update({ body }).eq("id", commentId || id),
        message: () => supabase.from("community_channel_messages").update({ body }).eq("id", messageId || id),
      };
      const updateRequest = updateByType[type];
      const { error } = updateRequest ? await updateRequest() : { error: new Error("Unsupported edit type") };

      if (error) {
        const message = getCommunityErrorMessage(error, "Edit failed. Make sure the latest Community edit migrations are applied.");
        setCommunityEditFeedback(message);
        setCommunityError(message);
        setCommunityEditSaving(false);
        return;
      }

      await refreshCommunityFromSupabase();
      setCommunityEditSaving(false);
      setCommunityEditDialog(null);
      setCommunityEditValue("");
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) => {
        if (type === "server") {
          return server.id === id ? { ...server, description: body } : server;
        }

        if (server.id !== serverId && server.id !== activeCommunityServer?.id) return server;

        if (type === "channel") {
          return {
            ...server,
            channels: (server.channels ?? []).map((channel) =>
              channel.id === id ? { ...channel, topic: body } : channel,
            ),
          };
        }

        if (type === "message") {
          return {
            ...server,
            channels: (server.channels ?? []).map((channel) =>
              channel.id === channelId
                ? {
                    ...channel,
                    messages: (channel.messages ?? []).map((message) =>
                      message.id === (messageId || id) ? { ...message, text: body } : message,
                    ),
                  }
                : channel,
            ),
          };
        }

        if (type === "post") {
          return {
            ...server,
            posts: (server.posts ?? []).map((post) => (post.id === id ? { ...post, text: body } : post)),
          };
        }

        if (type === "comment") {
          return {
            ...server,
            posts: (server.posts ?? []).map((post) =>
              post.id === postId
                ? {
                    ...post,
                    comments: (post.comments ?? []).map((comment) =>
                      comment.id === (commentId || id) ? { ...comment, text: body } : comment,
                    ),
                  }
                : post,
            ),
          };
        }

        return server;
      }),
    }));
    setCommunityEditSaving(false);
    setCommunityEditDialog(null);
    setCommunityEditValue("");
  }

  async function createCommunityServer(event) {
    event.preventDefault();
    const name = communityServerForm.name.trim();
    if (!name) return;

    const description = communityServerForm.description.trim() || "A new SkillBridge community server.";
    const inviteUrl = normalizeDiscordInviteUrl(communityServerForm.inviteUrl);

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const serverPayload = {
        name,
        description,
        owner_id: state.auth.accountId,
      };
      const payloadWithInvite = {
        ...serverPayload,
        invite_url: inviteUrl || null,
      };
      let { data, error } = await supabase
        .from("community_servers")
        .insert(payloadWithInvite)
        .select("id")
        .single();

      if (error?.message?.includes("invite_url")) {
        const retryResult = await supabase
          .from("community_servers")
          .insert(serverPayload)
          .select("id")
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Server creation failed") },
        }));
        return;
      }

      await supabase.from("community_server_members").upsert({ server_id: data.id, user_id: state.auth.accountId });
      setCommunityServerForm({ name: "", description: "", inviteUrl: "" });
      await refreshCommunityFromSupabase();
      setState((current) => ({
        ...current,
        community: { ...(current.community ?? defaultState.community), activeServerId: data.id },
      }));
      return;
    }

    const serverId = `${normalizeCommunitySlug(name)}-${Date.now()}`;
    updateCommunity((community) => ({
      ...community,
      activeServerId: serverId,
      activeChannelId: "",
      joinedServerIds: [...new Set([...(community.joinedServerIds ?? []), serverId])],
      servers: [
        ...(community.servers ?? []),
        {
          id: serverId,
          ownerId: state.auth.accountId || "local-user",
          name,
          description,
          inviteUrl,
          members: 1,
          joined: true,
          channels: [],
          posts: [],
        },
      ],
    }));
    setCommunityServerForm({ name: "", description: "", inviteUrl: "" });
  }

  async function joinCommunityServer(serverId) {
    const selectedServer = communityServers.find((server) => server.id === serverId);

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const { error } = await supabase
        .from("community_server_members")
        .upsert({ server_id: serverId, user_id: state.auth.accountId });

      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Unable to join server") },
        }));
        return;
      }

      await refreshCommunityFromSupabase();
      setState((current) => ({
        ...current,
        community: {
          ...(current.community ?? defaultState.community),
          activeServerId: serverId,
          activeChannelId: selectedServer?.channels?.[0]?.id || "",
          activeChatChannelId: selectedServer?.channels?.[0]?.id || "__server__",
        },
      }));
    }

    updateCommunity((community) => ({
      ...community,
      activeServerId: serverId,
      activeChannelId: selectedServer?.channels?.[0]?.id || "",
      activeChatChannelId: selectedServer?.channels?.[0]?.id || "__server__",
      joinedServerIds: [...new Set([...(community.joinedServerIds ?? []), serverId])],
      servers: (community.servers ?? []).map((server) =>
        server.id === serverId
          ? { ...server, joined: true, members: server.joined ? server.members : server.members + 1 }
          : server,
      ),
    }));
  }

  function openCommunityServer(serverId) {
    const selectedServer = communityServers.find((server) => server.id === serverId);
    updateCommunity((community) => ({
      ...community,
      activeServerId: serverId,
      activeChannelId: selectedServer?.channels?.[0]?.id || "",
      activeChatChannelId: selectedServer?.channels?.[0]?.id || "__server__",
    }));
  }

  function openDiscordInvite(inviteUrl) {
    const safeUrl = normalizeDiscordInviteUrl(inviteUrl);
    if (!safeUrl) return;

    window.open(safeUrl, "_blank", "noopener,noreferrer");
  }

  function handleCommunityServerClick(server, joined) {
    if (server.inviteUrl) {
      if (joined) {
        openCommunityServer(server.id);
      } else {
        joinCommunityServer(server.id).catch(() => {});
      }
      openDiscordInvite(server.inviteUrl);
      return;
    }

    if (joined) {
      openCommunityServer(server.id);
      return;
    }

    joinCommunityServer(server.id);
  }

  async function createCommunityChannel(event) {
    event.preventDefault();
    const cleanName = normalizeCommunitySlug(communityChannelForm.name, "");
    if (!cleanName || !activeCommunityServer) return;

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const { data, error } = await supabase
        .from("community_channels")
        .insert({
          server_id: activeCommunityServer.id,
          name: cleanName,
          topic: communityChannelForm.topic.trim() || "A new SkillBridge channel.",
          created_by: state.auth.accountId,
        })
        .select("id")
        .single();

      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Channel creation failed") },
        }));
        return;
      }

      setCommunityChannelForm({ name: "", topic: "" });
      await refreshCommunityFromSupabase();
      setState((current) => ({
        ...current,
        community: { ...(current.community ?? defaultState.community), activeChannelId: data.id, activeChatChannelId: data.id },
      }));
      return;
    }

    const channelId = `${cleanName}-${Date.now()}`;
    const channel = {
      id: channelId,
      createdBy: state.auth.accountId || "local-user",
      name: cleanName,
      topic: communityChannelForm.topic.trim() || "A new SkillBridge community channel.",
      messages: [],
    };

    updateCommunity((community) => ({
      ...community,
      activeChannelId: channelId,
      activeChatChannelId: channelId,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer.id
          ? { ...server, channels: [...(server.channels ?? []), channel] }
          : server,
      ),
    }));
    setCommunityChannelForm({ name: "", topic: "" });
  }

  function openCommunityChannel(channelId) {
    updateCommunity((community) => ({
      ...community,
      activeChannelId: channelId,
      activeChatChannelId: channelId,
    }));
  }

  async function sendCommunityMessage(event) {
    event.preventDefault();
    const text = communityMessageDraft.trim();
    if (!text || !activeChatChannel) return;

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const { error } = await supabase.from("community_channel_messages").insert({
        channel_id: activeChatChannel.id,
        author_id: state.auth.accountId,
        author_name: currentCommunityAuthor,
        author_role: currentCommunityRole,
        body: text,
      });

      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Message failed") },
        }));
        return;
      }

      setCommunityMessageDraft("");
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer?.id
          ? {
              ...server,
              channels: (server.channels ?? []).map((channel) =>
                channel.id === activeChatChannel.id
                  ? {
                      ...channel,
                      messages: [
                        ...(channel.messages ?? []),
                        { id: Date.now(), authorId: state.auth.accountId || "local-user", author: currentCommunityAuthor, role: currentCommunityRole, text, time: "Now" },
                      ],
                    }
                  : channel,
              ),
            }
          : server,
      ),
    }));
    setCommunityMessageDraft("");
  }

  async function deleteCommunityMessage(messageId) {
    const message = activeChatChannel?.messages.find((item) => item.id === messageId);
    if (!canDeleteCommunityItem(message?.authorId) || !window.confirm("Delete this message?")) return;

    if (hasSupabaseConfig && supabase && hasActiveSubscription) {
      const { error } = await supabase.from("community_channel_messages").delete().eq("id", messageId);
      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Message deletion failed") },
        }));
        return;
      }
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer?.id
          ? {
              ...server,
              channels: (server.channels ?? []).map((channel) =>
                channel.id === activeChatChannel?.id
                  ? { ...channel, messages: (channel.messages ?? []).filter((item) => item.id !== messageId) }
                  : channel,
              ),
            }
          : server,
      ),
    }));
  }

  async function editCommunityMessage(messageId) {
    const message = activeChatChannel?.messages.find((item) => item.id === messageId);
    if (!canDeleteCommunityItem(message?.authorId)) {
      setCommunityError("Only the message author can edit this message.");
      return;
    }

    openCommunityEditDialog({
      type: "message",
      id: messageId,
      messageId,
      serverId: activeCommunityServer?.id,
      channelId: activeChatChannel?.id,
      title: "Edit message",
      label: "Message",
      value: message.text || "",
      rows: 4,
    });
  }

  async function createCommunityPost(event) {
    event.preventDefault();
    const text = communityPostDraft.trim();
    if (!text || !activeCommunityServer) return;

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const { error } = await supabase.from("community_posts").insert({
        server_id: activeCommunityServer.id,
        author_id: state.auth.accountId,
        author_name: currentCommunityAuthor,
        author_role: currentCommunityRole,
        body: text,
        expires_at: getCommunityExpiryDate(),
      });

      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Post failed") },
        }));
        return;
      }

      setCommunityPostDraft("");
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer.id
          ? {
              ...server,
              posts: [
                {
                  id: Date.now(),
                  authorId: state.auth.accountId || "local-user",
                  author: currentCommunityAuthor,
                  role: currentCommunityRole,
                  text,
                  likes: 0,
                  likedByMe: false,
                  comments: [],
                  time: "Now",
                  expiresAt: getCommunityExpiryDate(),
                },
                ...(server.posts ?? []),
              ],
            }
          : server,
      ),
    }));
    setCommunityPostDraft("");
  }

  async function toggleCommunityPostReaction(postId) {
    const server = activeCommunityServer;
    const post = server?.posts.find((item) => item.id === postId);
    if (!server || !post) return;

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const request = post.likedByMe
        ? supabase.from("community_post_reactions").delete().eq("post_id", postId).eq("user_id", state.auth.accountId)
        : supabase.from("community_post_reactions").insert({ post_id: postId, user_id: state.auth.accountId });
      const { error } = await request;
      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Reaction failed") },
        }));
        return;
      }
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((item) =>
        item.id === server.id
          ? {
              ...item,
              posts: (item.posts ?? []).map((currentPost) =>
                currentPost.id === postId
                  ? {
                      ...currentPost,
                      likedByMe: !currentPost.likedByMe,
                      likes: Math.max(0, (currentPost.likes ?? 0) + (currentPost.likedByMe ? -1 : 1)),
                    }
                  : currentPost,
              ),
            }
          : item,
      ),
    }));
  }

  async function createCommunityComment(event, postId) {
    event.preventDefault();
    const text = String(communityCommentDrafts[postId] || "").trim();
    if (!text || !activeCommunityServer) return;

    if (hasSupabaseConfig && supabase && state.auth.accountId && hasActiveSubscription) {
      const { error } = await supabase.from("community_post_comments").insert({
        post_id: postId,
        author_id: state.auth.accountId,
        author_name: currentCommunityAuthor,
        author_role: currentCommunityRole,
        body: text,
      });

      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Comment failed") },
        }));
        return;
      }

      setCommunityCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer.id
          ? {
              ...server,
              posts: (server.posts ?? []).map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      comments: [
                        ...(post.comments ?? []),
                        { id: Date.now(), authorId: state.auth.accountId || "local-user", author: currentCommunityAuthor, role: currentCommunityRole, text, time: "Now", expiresAt: getCommunityExpiryDate() },
                      ],
                    }
                  : post,
              ),
            }
          : server,
      ),
    }));
    setCommunityCommentDrafts((current) => ({ ...current, [postId]: "" }));
  }

  function canDeleteCommunityItem(ownerId) {
    return Boolean(ownerId && state.auth.accountId && ownerId === state.auth.accountId);
  }

  async function deleteCommunityServer(serverId) {
    const server = communityServers.find((item) => item.id === serverId);
    if (!canDeleteCommunityItem(server?.ownerId) || !window.confirm(`Delete "${server.name}" and all of its channels, posts, and comments?`)) return;

    if (hasSupabaseConfig && supabase && hasActiveSubscription) {
      const { error } = await supabase.from("community_servers").delete().eq("id", serverId);
      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Server deletion failed") },
        }));
        return;
      }
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => {
      const servers = (community.servers ?? []).filter((item) => item.id !== serverId);
      return {
        ...community,
        servers,
        joinedServerIds: (community.joinedServerIds ?? []).filter((id) => id !== serverId),
        activeServerId: community.activeServerId === serverId ? servers[0]?.id || "" : community.activeServerId,
        activeChannelId: community.activeServerId === serverId ? servers[0]?.channels?.[0]?.id || "" : community.activeChannelId,
        activeChatChannelId: community.activeServerId === serverId ? "" : community.activeChatChannelId,
      };
    });
  }

  async function editCommunityServerDescription(serverId) {
    const server = communityServers.find((item) => item.id === serverId);
    if (!canDeleteCommunityItem(server?.ownerId)) {
      setCommunityError("Only the server owner can edit this server.");
      return;
    }

    openCommunityEditDialog({
      type: "server",
      id: serverId,
      serverId,
      title: "Edit server description",
      label: "Server description",
      value: server.description || "",
      rows: 4,
    });
  }

  async function deleteCommunityChannel(channelId) {
    const channel = communityChannels.find((item) => item.id === channelId);
    if (!canDeleteCommunityItem(channel?.createdBy) || !window.confirm(`Delete #${channel.name} and its messages?`)) return;

    if (hasSupabaseConfig && supabase && hasActiveSubscription) {
      const { error } = await supabase.from("community_channels").delete().eq("id", channelId);
      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Channel deletion failed") },
        }));
        return;
      }
      await refreshCommunityFromSupabase();
      setState((current) => ({
        ...current,
        community: {
          ...(current.community ?? defaultState.community),
          activeChatChannelId: current.community?.activeChatChannelId === channelId ? "" : current.community?.activeChatChannelId || "",
        },
      }));
      return;
    }

    updateCommunity((community) => ({
      ...community,
      activeChannelId: community.activeChannelId === channelId ? "" : community.activeChannelId,
      activeChatChannelId: community.activeChatChannelId === channelId ? "" : community.activeChatChannelId,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer?.id
          ? { ...server, channels: (server.channels ?? []).filter((item) => item.id !== channelId) }
          : server,
      ),
    }));
  }

  async function editCommunityChannelDescription(channelId) {
    const channel = communityChannels.find((item) => item.id === channelId);
    if (!canDeleteCommunityItem(channel?.createdBy)) {
      setCommunityError("Only the channel creator can edit this channel.");
      return;
    }

    openCommunityEditDialog({
      type: "channel",
      id: channelId,
      serverId: activeCommunityServer?.id,
      title: "Edit channel description",
      label: "Channel description",
      value: channel.topic || "",
      rows: 4,
    });
  }

  async function deleteCommunityPost(postId) {
    const post = activeCommunityServer?.posts.find((item) => item.id === postId);
    if (!canDeleteCommunityItem(post?.authorId) || !window.confirm("Delete this post and all of its comments?")) return;

    if (hasSupabaseConfig && supabase && hasActiveSubscription) {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Post deletion failed") },
        }));
        return;
      }
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer?.id
          ? { ...server, posts: (server.posts ?? []).filter((item) => item.id !== postId) }
          : server,
      ),
    }));
  }

  async function editCommunityPost(postId) {
    const post = activeCommunityServer?.posts.find((item) => item.id === postId);
    if (!canDeleteCommunityItem(post?.authorId)) {
      setCommunityError("Only the post author can edit this post.");
      return;
    }

    openCommunityEditDialog({
      type: "post",
      id: postId,
      serverId: activeCommunityServer?.id,
      title: "Edit post",
      label: "Post",
      value: post.text || "",
      rows: 5,
    });
  }

  async function deleteCommunityComment(postId, commentId) {
    const post = activeCommunityServer?.posts.find((item) => item.id === postId);
    const comment = post?.comments.find((item) => item.id === commentId);
    if (!canDeleteCommunityItem(comment?.authorId) || !window.confirm("Delete this comment?")) return;

    if (hasSupabaseConfig && supabase && hasActiveSubscription) {
      const { error } = await supabase.from("community_post_comments").delete().eq("id", commentId);
      if (error) {
        setState((current) => ({
          ...current,
          community: { ...(current.community ?? defaultState.community), error: getCommunityErrorMessage(error, "Comment deletion failed") },
        }));
        return;
      }
      await refreshCommunityFromSupabase();
      return;
    }

    updateCommunity((community) => ({
      ...community,
      servers: (community.servers ?? []).map((server) =>
        server.id === activeCommunityServer?.id
          ? {
              ...server,
              posts: (server.posts ?? []).map((item) =>
                item.id === postId
                  ? { ...item, comments: (item.comments ?? []).filter((commentItem) => commentItem.id !== commentId) }
                  : item,
              ),
            }
          : server,
      ),
    }));
  }

  async function editCommunityComment(postId, commentId) {
    const post = activeCommunityServer?.posts.find((item) => item.id === postId);
    const comment = post?.comments.find((item) => item.id === commentId);
    if (!canDeleteCommunityItem(comment?.authorId)) {
      setCommunityError("Only the comment author can edit this comment.");
      return;
    }

    openCommunityEditDialog({
      type: "comment",
      id: commentId,
      serverId: activeCommunityServer?.id,
      postId,
      commentId,
      title: "Edit comment",
      label: "Comment",
      value: comment.text || "",
      rows: 4,
    });
  }

  function sendSupportMessage(event) {
    event.preventDefault();
    const text = supportMessageDraft.trim();
    if (!text) return;

    setState((current) => ({
      ...current,
      supportMessages: [
        ...(current.supportMessages ?? []),
        {
          id: Date.now(),
          author: currentCommunityAuthor,
          text,
          time: "Now",
        },
      ],
    }));
    setSupportMessageDraft("");
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
      const usedFallback = Boolean(parsed.usedFallback);
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
      const nextFullName = usedFallback ? profileSnapshot.fullName : parsedFullName || profileSnapshot.fullName;
      const nextFirstName = usedFallback ? profileSnapshot.firstName : parsedFirstName || nextFullName.split(" ")[0] || profileSnapshot.firstName;
      const nextLastName = usedFallback ? profileSnapshot.lastName : parsedLastName || nextFullName.split(" ").slice(1).join(" ") || profileSnapshot.lastName;
      const nextProfile = {
        ...profileSnapshot,
        fullName: nextFullName,
        firstName: nextFirstName,
        lastName: nextLastName,
        jobTitle: usedFallback ? profileSnapshot.jobTitle : parsed.headline || profileSnapshot.jobTitle,
        location: usedFallback ? profileSnapshot.location : parsedLocation,
        about: usedFallback ? profileSnapshot.about : parsed.summary || profileSnapshot.about,
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
          error: usedFallback
            ? `Gemini resume analysis was unavailable. Your existing profile details were preserved and locally extracted skills were saved. ${parsed.parserError || ""}`.trim()
            : "",
          updatedAt: getTodayShortDate(),
        },
      }));

      await persistProfileRecord(state.auth.accountId, nextProfile);
      await clearCachedRoadmaps();
    } catch (error) {
      setState((current) => ({
        ...current,
        profileSavedAt: "Resume save failed",
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

    try {
      await persistProfileRecord(state.auth.accountId, nextProfile);
      await clearCachedRoadmaps();
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : "Unable to save profile changes.");
      return;
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
    return partitionRequiredSkills(getApplicantSkills(state.profile), listing.requiredSkills).matched;
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
          const message = String(error.message || "");
          if (/email.*not.*confirm/i.test(message)) {
            setAuthFeedback("Verify your email from your inbox before logging in.");
            return;
          }

          setAuthFeedback(message || "Unable to log in with that account.");
          return;
        }

        const userId = data.user?.id ?? data.session?.user?.id;

        if (userId) {
          const { data: profileRecord, error: profileError } = await supabase
            .from("profiles")
            .select("*")
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

          const loggedInRole = profileRecord?.role || data.user?.user_metadata?.role || "Applicant";
          const loggedInProfile = mapProfileRecordToState(
            profileRecord || {
              role: loggedInRole,
              full_name: data.user?.user_metadata?.full_name || authForm.email.trim().split("@")[0],
              first_name: data.user?.user_metadata?.first_name || "",
              last_name: data.user?.user_metadata?.last_name || "",
              email: authForm.email.trim(),
              username: `@${(data.user?.user_metadata?.full_name || authForm.email.trim().split("@")[0])
                .toLowerCase()
                .replace(/\s+/g, ".")}`,
            },
            data.user,
          );

          setState((current) => ({
            ...current,
            authModalOpen: false,
            authMode: "login",
            activeSidebar:
              loggedInRole === "Admin"
                ? "analytics"
                : current.activeSidebar === "analytics"
                  ? "discover"
                  : current.activeSidebar,
            auth: {
              ...current.auth,
              isAuthenticated: true,
              accountId: userId,
              accountName: loggedInProfile.fullName,
              accountEmail: loggedInProfile.email,
              accountRole: loggedInProfile.role,
              password: "",
            },
            profile: loggedInProfile,
          }));
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
    const role = normalizePublicSignupRole(authForm.role);

    if (hasSupabaseConfig && supabase) {
      const email = authForm.email.trim().toLowerCase();
      const { error } = await supabase.auth.signUp({
        email,
        password: authForm.password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            role,
            username,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setAuthFeedback(error.message || "Unable to create your account.");
        return;
      }

      setAuthFeedback("Account created. Verify your email from your inbox before logging in.");
      setAuthForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
      setState((current) => ({
        ...current,
        authMode: "login",
      }));
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
      applications: [],
      saved: [],
      applicationStatusById: initialApplicationStatus,
      careerRoadmaps: [],
      expandedApplicationId: null,
      expandedRoadmapId: "",
      profileExperience: [],
      profileCertificates: [],
      adminCertifications: [],
      roadmapStatus: {
        ...defaultState.roadmapStatus,
      },
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

          <nav
            className="sidebar-nav"
            style={{
              "--sidebar-active-index": sidebarActiveIndex,
            }}
          >
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

      <main key={`${isAdmin ? "admin" : "applicant"}-${state.activeSidebar}`} className="dashboard-main content-appear">
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

            {authFeedback ? <p className="auth-feedback">{authFeedback}</p> : null}

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

            <article className="progress-card announcement-composer-card">
              <div className="announcement-composer-head">
                <div>
                  <span className="section-kicker">HOMEPAGE ANNOUNCEMENT</span>
                  <h3>Create Announcement</h3>
                  <p>Publish a banner-backed announcement to the Discover carousel with an expiration date and destination.</p>
                </div>
                <button className="profile-primary-button" type="button" onClick={() => createAnnouncement().catch(() => {})}>
                  Publish Announcement
                </button>
              </div>

              {authFeedback ? <p className="auth-feedback">{authFeedback}</p> : null}

              <div className="announcement-composer-layout">
                <div className="announcement-main-fields">
                  <div className="announcement-field-grid">
                    <label className="auth-field announcement-field">
                      <span>Title</span>
                      <input value={announcementForm.title} onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} placeholder="Announcement headline" />
                    </label>
                    <label className="auth-field announcement-field">
                      <span>Button Label</span>
                      <input value={announcementForm.link} onChange={(event) => setAnnouncementForm((current) => ({ ...current, link: event.target.value }))} placeholder="View update" />
                    </label>
                  </div>

                  <label className="auth-field announcement-field announcement-body-field">
                    <span>Announcement</span>
                    <textarea value={announcementForm.body} onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))} rows={6} placeholder="Write the announcement message here..." />
                  </label>
                </div>

                <div className="announcement-side-fields">
                  <div className="announcement-field-grid">
                    <label className="auth-field announcement-field">
                      <span>Tag</span>
                      <input value={announcementForm.tag} onChange={(event) => setAnnouncementForm((current) => ({ ...current, tag: event.target.value }))} placeholder="Update" />
                    </label>
                    <label className="auth-field announcement-field">
                      <span>Label</span>
                      <input value={announcementForm.label} onChange={(event) => setAnnouncementForm((current) => ({ ...current, label: event.target.value }))} placeholder="Announcement" />
                    </label>
                    <label className="auth-field announcement-field">
                      <span>Target Category</span>
                      <select value={announcementForm.targetCategory} onChange={(event) => setAnnouncementForm((current) => ({ ...current, targetCategory: event.target.value }))}>
                        <option value="">None</option>
                        <option value="jobs">Jobs</option>
                        <option value="internships">Internship</option>
                        <option value="volunteer">Volunteer</option>
                      </select>
                    </label>
                    <label className="auth-field announcement-field">
                      <span>Expires On</span>
                      <input type="date" value={announcementForm.expirationDate} onChange={(event) => setAnnouncementForm((current) => ({ ...current, expirationDate: event.target.value }))} />
                    </label>
                  </div>

                  <label className="auth-field announcement-field announcement-banner-upload">
                    <span>Banner / Photo</span>
                    <input type="file" accept="image/*" onChange={handleAnnouncementBannerChange} />
                    <small>{announcementForm.bannerName || "Upload a banner image for the carousel card."}</small>
                  </label>

                  {announcementForm.bannerUrl ? (
                    <div className="announcement-banner-preview-wrap">
                      <img src={announcementForm.bannerUrl} alt="Announcement banner preview" className="announcement-banner-preview" />
                    </div>
                  ) : null}
                </div>
              </div>
            </article>

            <article className="progress-card">
              <h3>Announcement Manager</h3>
              <div className="progress-card-list">
                {state.adminAnnouncements.map((item) => (
                  <div key={item.id} className="profile-mini-card announcement-manager-card">
                    {item.bannerUrl ? <img src={item.bannerUrl} alt={item.title} className="announcement-manager-thumb" /> : null}
                    <div className="announcement-manager-copy">
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <span>{item.isActive ? "Published" : "Inactive"}{item.endsAt ? ` • Expires ${formatAnnouncementDate(item.endsAt)}` : ""}</span>
                    </div>
                    <button className="ghost-action" type="button" onClick={() => toggleAnnouncementActive(item.id, !item.isActive).catch(() => {})}>
                      {item.isActive ? "Deactivate" : "Publish"}
                    </button>
                  </div>
                ))}
                {state.adminAnnouncements.length === 0 ? (
                  <div className="empty-feed">
                    <h3>No announcements yet</h3>
                    <p>Create the first live homepage announcement here.</p>
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "discover" && (
          <>
            {announcementSlides.length > 0 ? (
            <section className="announcement-section">
              <div className="section-label">
                <ShieldCheck size={13} />
                <span>Announcements</span>
                <strong>{announcementSlides.length}</strong>
              </div>

              <div className="announcement-viewport">
                <div
                  className="announcement-track"
                  style={{ "--announcement-active-index": activeAnnouncement }}
                >
                  {announcementSlides.map((slide) => (
                    <article key={slide.id} className="announcement-card">
                      {slide.bannerUrl ? (
                        <img src={slide.bannerUrl} alt={slide.title} className="announcement-banner" />
                      ) : (
                        <div className="announcement-icon">
                          <ShieldCheck size={15} />
                        </div>
                      )}
                      <div className="announcement-content">
                        {(slide.tag || slide.label) ? (
                          <div className="announcement-pills">
                            {slide.tag ? <span>{slide.tag}</span> : null}
                            {slide.label ? <span>{slide.label}</span> : null}
                          </div>
                        ) : null}
                        <h2>{slide.title}</h2>
                        <p>{slide.body}</p>
                        {slide.link ? (
                          <button className="announcement-link" type="button" onClick={() => handleAnnouncementAction(slide)}>
                            {slide.link}
                            <ArrowRight size={13} />
                          </button>
                        ) : null}
                      </div>
                      <time>{slide.date}</time>
                    </article>
                  ))}
                </div>
              </div>

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
            ) : null}

            <section className="discover-section">
              <article className="ai-studio-card">
                <div className="ai-studio-head">
                  <div className="ai-studio-status ai-studio-status-inline">
                    <span>{hasSupabaseConfig ? "Live Supabase connected" : "Supabase not configured"}</span>
                    <span>{state.liveJobs.length} live jobs loaded</span>
                    <span>
                      {state.aiStatus.recommendationModel === "gemini-embedding-001"
                        ? `Gemini-assisted top ${state.aiStatus.semanticCandidates} jobs`
                        : "Weighted fallback ranking"}
                    </span>
                    <span>{state.aiStatus.updatedAt ? `Last updated ${state.aiStatus.updatedAt}` : "Last updated not yet available"}</span>
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

                {state.aiStatus.error && <p className="ai-error-message">{state.aiStatus.error}</p>}
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

              <div
                className="category-bar"
                style={{
                  "--category-active-index": categoryActiveIndex,
                }}
              >
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

              <p className="listing-caption">FEDERATED MATCHES | ranked in SkillBridge, applied on the original source site</p>

              <div key={state.activeCategory} className="listing-stack content-appear">
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
                        <MatchScore listing={listing} theme={state.theme} />
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
                            applyToJob(listing);
                          }}
                        >
                          <ArrowRight size={14} />
                          {isApplied ? "Opened Source" : "Apply on Source"}
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

            <div
              className="applications-tabs"
              style={{ "--tab-active-index": applicationsTabIndex }}
            >
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

            <div key={state.applicationsTab} className="application-list content-appear">
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
                          <MatchScore listing={card} theme={state.theme} />
                          <button
                            className="expand-button"
                            type="button"
                            aria-label="Toggle application details"
                            aria-expanded={expanded}
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
                        <div className="application-details application-details-appear">
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
                        <MatchScore listing={card} theme={state.theme} />
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

        {!isAdmin && state.activeSidebar === "training" && !hasActiveSubscription && (
          <PremiumLockScreen pageName="Development" onSubscribe={() => patchState({ activeSidebar: "subscription" })} />
        )}

        {!isAdmin && state.activeSidebar === "training" && hasActiveSubscription && (
          <div
            className="applications-tabs progress-tabs training-tabs"
            style={{ "--tab-active-index": trainingTabIndex, "--tab-count": trainingTabs.length }}
          >
            {trainingTabs.map((tab) => (
              <button
                key={tab.id}
                className={`applications-tab${state.trainingTab === tab.id ? " active" : ""}`}
                type="button"
                onClick={() => patchState({ trainingTab: tab.id })}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {!isAdmin && state.activeSidebar === "training" && state.trainingTab === "progress" && hasActiveSubscription && (
          <section className="progress-section">
            <div className="applications-head">
              <div>
                <h1>Training</h1>
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

            <div
              className="applications-tabs progress-tabs"
              style={{ "--tab-active-index": progressTabIndex }}
            >
              {progressTabs.map((tab) => (
                <button key={tab.id} className={`applications-tab${state.progressTab === tab.id ? " active" : ""}`} type="button" onClick={() => patchState({ progressTab: tab.id })}>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div key={state.progressTab} className="progress-card-list content-appear">
              {visibleProgressCards.map((card) => {
                const practiceKey = `${card.type}-${card.id}`;
                const cardQuestions = practiceTestQuestionsByCourse[practiceKey] ?? defaultPracticeTestQuestions;
                const cardAnswers = practiceAnswers[practiceKey] ?? {};
                const answeredCount = cardQuestions.filter((item) => cardAnswers[item.id] !== undefined).length;
                const correctCount = cardQuestions.filter((item) => cardAnswers[item.id] === item.answer).length;

                return (
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

                    <div className="learning-module">
                      <div className="learning-module-head">
                        <div>
                          <span className="section-kicker">Module 1</span>
                          <h4>Practice 10-item Multiple Choice Test</h4>
                          <p>Check your understanding with a short module quiz for this course.</p>
                        </div>
                        <div className="module-score">
                          <strong>{correctCount}/{cardQuestions.length}</strong>
                          <span>{answeredCount} answered</span>
                        </div>
                      </div>

                      <div className="module-lesson-row">
                        <span>Lesson review</span>
                        <span>Practice test</span>
                        <span>Instant feedback</span>
                      </div>

                      <div className="module-action-row">
                        <span>{answeredCount === cardQuestions.length ? "Practice test completed" : "Practice test available"}</span>
                        <button
                          className="roadmap-cta module-test-button"
                          type="button"
                          onClick={() => setActivePracticeTest({ key: practiceKey, title: card.title, questions: cardQuestions, questionIndex: 0, navDirection: "next" })}
                        >
                          {answeredCount > 0 ? "Continue Practice Test" : "Start Practice Test"}
                        </button>
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
                );
              })}
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
                <p>Gemini builds roadmaps for your first three active applications using your profile and resume context.</p>
              </div>
            </div>

            <div className="roadmap-meta">
              <span className="status-badge ready">{roadmapCandidateJobs.length}/3 tracked applications</span>
              <span>
                {state.roadmapStatus.loading
                  ? "Improving with AI..."
                  : state.roadmapStatus.roadmapEngine === "local-fallback"
                    ? "Instant local roadmap"
                    : "AI-assisted roadmap"}
              </span>
              <span>
                {state.roadmapStatus.updatedAt ? `Updated ${getTodayLongDateFromValue(state.roadmapStatus.updatedAt)}` : "Waiting for roadmap generation"}
              </span>
              {state.roadmapStatus.loading ? (
                <span>{state.roadmapStatus.progressPercent}% complete</span>
              ) : null}
            </div>

            {roadmapCandidateJobs.length > 0 ? (
              <div className="roadmap-generate-row">
                <button
                  className="profile-primary-button small"
                  type="button"
                  onClick={requestCareerRoadmaps}
                  disabled={state.roadmapStatus.loading}
                >
                  {state.roadmapStatus.loading ? "Generating..." : "Generate Roadmap"}
                </button>
              </div>
            ) : null}

            {state.roadmapStatus.loading ? (
              <div className="roadmap-progress-block" aria-live="polite">
                <div className="roadmap-progress-bar">
                  <div className="roadmap-progress-fill" style={{ width: `${state.roadmapStatus.progressPercent}%` }} />
                </div>
                <span>{state.roadmapStatus.progressLabel || `${state.roadmapStatus.progressPercent}% complete`}</span>
              </div>
            ) : null}

            {state.roadmapStatus.error ? <p className="form-feedback">{state.roadmapStatus.error}</p> : null}

            {state.roadmapStatus.loading && roadmapItems.length === 0 ? (
              <div className="profile-empty-card roadmap-empty-card">
                <strong>Generating your roadmap...</strong>
                <p>This can take a few seconds while Gemini reviews your applied jobs and profile.</p>
              </div>
            ) : null}

            {!state.roadmapStatus.loading && roadmapCandidateJobs.length === 0 ? (
              <div className="profile-empty-card roadmap-empty-card">
                Apply to up to three jobs from Discover to generate personalized roadmaps here. Withdrawing an application will remove its roadmap automatically.
              </div>
            ) : null}

            {!state.roadmapStatus.loading && roadmapCandidateJobs.length > 0 && roadmapItems.length === 0 && !state.roadmapStatus.error ? (
              <div className="profile-empty-card roadmap-empty-card">
                <strong>No roadmap generated yet.</strong>
                <p>Press Generate Roadmap to create AI roadmaps for your first three active applications.</p>
              </div>
            ) : null}

            {!state.roadmapStatus.loading && roadmapCandidateJobs.length > 0 && roadmapItems.length === 0 && state.roadmapStatus.error ? (
              <div className="profile-empty-card roadmap-empty-card">
                <strong>Roadmap generation failed.</strong>
                <p>{state.roadmapStatus.error || "No roadmap could be generated for your current applied jobs."}</p>
                <button className="profile-dashed-button roadmap-retry-button" type="button" onClick={retryCareerRoadmaps}>
                  Try Again
                </button>
              </div>
            ) : null}

            {roadmapItems.length > 1 ? (
              <div className="roadmap-switcher">
                <div className="roadmap-job-tabs" role="tablist" aria-label="Applied job roadmaps">
                  {roadmapItems.map((roadmap, index) => (
                    <button
                      key={roadmap.job_id}
                      className={`roadmap-job-tab${index === activeRoadmapIndex ? " active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={index === activeRoadmapIndex}
                      onClick={() => setActiveRoadmapIndex(index)}
                    >
                      <strong>{roadmap.title}</strong>
                      <span>{roadmap.company_name || "External employer"}</span>
                    </button>
                  ))}
                </div>

                <div className="roadmap-switcher-controls">
                  <button
                    className="roadmap-switcher-button"
                    type="button"
                    aria-label="Show previous applied job roadmap"
                    disabled={activeRoadmapIndex === 0}
                    onClick={() => setActiveRoadmapIndex((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>{activeRoadmapIndex + 1} / {roadmapItems.length}</span>
                  <button
                    className="roadmap-switcher-button"
                    type="button"
                    aria-label="Show next applied job roadmap"
                    disabled={activeRoadmapIndex >= roadmapItems.length - 1}
                    onClick={() => setActiveRoadmapIndex((current) => Math.min(roadmapItems.length - 1, current + 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}

            {activeRoadmap ? (
              <section key={activeRoadmap.job_id} className="roadmap-job-group content-appear">
                <div className="roadmap-job-head">
                  <div>
                    <h2>{activeRoadmap.title}</h2>
                    <p>{activeRoadmap.company_name || "External employer"}</p>
                  </div>
                  <div className="roadmap-job-meta">
                    <span>{activeRoadmap.estimated_timeline || "6-10 weeks"}</span>
                    <span>{activeRoadmap.target_role || state.profile.jobTitle || state.profile.aiProfile?.suggested_roles?.[0] || "Target role"}</span>
                    <span className={`status-badge ${activeRoadmap._source === "ai-enhanced" ? "ready" : "saved"}`}>
                      {activeRoadmap._source === "ai-enhanced" ? "AI Enhanced" : "Local Fallback"}
                    </span>
                  </div>
                </div>

                {activeRoadmap.fit_summary ? <p className="roadmap-fit-summary">{activeRoadmap.fit_summary}</p> : null}

                {activeRoadmap.focus_skills?.length ? (
                  <div className="progress-tags roadmap-focus-tags">
                    {activeRoadmap.focus_skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                ) : null}

                <div className="roadmap-timeline">
                  {activeRoadmap.phases.map((item, index) => (
                    <div key={`${activeRoadmap.job_id}:${item.id}`} className="roadmap-row">
                      <div className="timeline-node-wrap">
                        <div className={`timeline-node ${item.nodeClass}`}>{item.nodeClass === "done" ? <BadgeCheck size={13} /> : null}</div>
                        {index < activeRoadmap.phases.length - 1 && <div className={`timeline-line ${item.nodeClass}`} />}
                      </div>

                      <article className={`roadmap-card interactive-card ${item.nodeClass}`} onClick={() => toggleRoadmapItem(`${activeRoadmap.job_id}:${item.id}`)}>
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
                              toggleRoadmapItem(`${activeRoadmap.job_id}:${item.id}`);
                            }}
                          >
                            {item.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>

                        {item.expanded && (
                          <div className="roadmap-body roadmap-phase-appear">
                            <div className="roadmap-section-block">
                              <p>Skills</p>
                              {item.skills.length > 0 ? (
                                <div className="progress-tags">
                                  {item.skills.map((skill) => (
                                    <span key={skill}>{skill}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="roadmap-empty-copy">No specific skills were returned for this phase yet.</p>
                              )}
                            </div>

                            <div className="roadmap-section-block">
                              <p>Actions</p>
                              {item.actions.length > 0 ? (
                                <div className="roadmap-actions">
                                  {item.actions.map((action) => (
                                    <div key={action} className="roadmap-action">
                                      <ArrowRight size={12} />
                                      <span>{action}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="roadmap-empty-copy">No action steps were returned for this phase yet.</p>
                              )}
                            </div>

                            <button
                              className="roadmap-cta"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                patchState({ activeSidebar: "training", trainingTab: "mentorship" });
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
            ) : null}
          </section>
        )}

        {!isAdmin && state.activeSidebar === "training" && state.trainingTab === "mentorship" && hasActiveSubscription && (
          <section className="mentorship-section">
            <div className="applications-head">
              <div>
                <h1>Mentorship</h1>
                <p>Courses created and taught by industry mentors. Apply to join a cohort.</p>
              </div>
            </div>

            <div className="roadmap-meta">
              <span className="status-badge in-progress">Mentor-led | Live sessions</span>
              <span>{filteredMentorshipCourses.length} of {mentorshipCourses.length} courses available</span>
            </div>

            <label className="listing-search compact-search" htmlFor="mentorship-search">
              <Search size={17} />
              <input
                id="mentorship-search"
                value={mentorshipSearchQuery}
                onChange={(event) => setMentorshipSearchQuery(event.target.value)}
                placeholder="Search mentorships by mentor, role, course, skill..."
              />
            </label>

            <div key={state.trainingTab} className="progress-card-list content-appear">
              {filteredMentorshipCourses.length > 0 ? (
                filteredMentorshipCourses.map((course) => {
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
              })
              ) : (
                <div className="profile-empty-card">No mentorship courses match your search.</div>
              )}
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "training" && state.trainingTab === "certifications" && hasActiveSubscription && (
          <section className="certifications-section">
            <div className="applications-head">
              <div>
                <h1>Certifications</h1>
                <p>Industry certifications sourced from official partner websites.</p>
              </div>
            </div>

            <div className="roadmap-meta">
              <span className="status-badge ready">Official Partners</span>
              <span>{filteredCertifications.length} certification{filteredCertifications.length === 1 ? "" : "s"} shown</span>
            </div>

            <label className="listing-search compact-search" htmlFor="certification-search">
              <Search size={17} />
              <input
                id="certification-search"
                value={certificationSearchQuery}
                onChange={(event) => setCertificationSearchQuery(event.target.value)}
                placeholder="Search certifications by title, provider, track, skill..."
              />
            </label>

            <div
              className="cert-filter-row"
              style={{ "--cert-filter-active-index": certificationFilterIndex }}
            >
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

            <div key={`${state.certificationFilter}-${certificationSearchQuery}`} className="progress-card-list certification-list-appear">
              {filteredCertifications.length > 0 ? (
                filteredCertifications.map((cert, index) => {
                const practiced = state.certificationPractice.includes(cert.id);
                const portalVisited = state.certificationPortalVisits.includes(cert.id);

                return (
                  <article key={cert.id} className="cert-card" style={{ "--cert-card-index": index }}>
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
              })
              ) : (
                <div className="profile-empty-card">No certifications match your filters.</div>
              )}
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "community" && !hasActiveSubscription && (
          <PremiumLockScreen pageName="Community" onSubscribe={() => patchState({ activeSidebar: "subscription" })} />
        )}

        {!isAdmin && state.activeSidebar === "community" && hasActiveSubscription && activeCommunityServer && (
          <section className="community-section">
            <div className="applications-head">
              <div>
                <h1>Community</h1>
                <p>Find and join servers, browse their channels, chat with peers, and share posts with subscribed SkillBridge users.</p>
              </div>
            </div>

            {state.community?.error ? <p className="form-feedback">{state.community.error}</p> : null}

            <div className="community-layout">
              <aside className="community-sidebar">
                <div className="community-sidebar-head">
                  <span className="section-kicker">Servers</span>
                  <strong>{filteredCommunityServers.length} of {communityServers.length} available</strong>
                </div>

                <label className="listing-search compact-search community-search" htmlFor="community-server-search">
                  <Search size={16} />
                  <input
                    id="community-server-search"
                    value={communityServerSearchQuery}
                    onChange={(event) => setCommunityServerSearchQuery(event.target.value)}
                    placeholder="Search servers..."
                  />
                </label>

                <div className="community-server-list">
                  {filteredCommunityServers.length > 0 ? (
                    filteredCommunityServers.map((server) => {
                    const joined = joinedCommunityServerIds.includes(server.id) || server.joined;
                    const active = activeCommunityServer.id === server.id;

                    return (
                      <div
                        key={server.id}
                        className={`community-server-row${active ? " active" : ""}`}
                      >
                        <button
                          className="community-server"
                          type="button"
                          onClick={() => handleCommunityServerClick(server, joined)}
                        >
                          <Users size={15} />
                          <span className="community-server-name">
                            {server.name}
                            {server.inviteUrl ? (
                              <span className="community-discord-indicator" aria-label="Has Discord invite">
                                <DiscordLogo size={12} />
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {canDeleteCommunityItem(server.ownerId) ? (
                          <div className="community-owner-actions">
                            <button
                              className="community-edit-button"
                              type="button"
                              aria-label={`Edit ${server.name}`}
                              onClick={() => editCommunityServerDescription(server.id)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="community-delete-button"
                              type="button"
                              aria-label={`Delete ${server.name}`}
                              onClick={() => deleteCommunityServer(server.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                  ) : (
                    <div className="profile-empty-card">No servers match your search.</div>
                  )}
                </div>

                <form className="community-create-card" onSubmit={createCommunityServer}>
                  <span className="section-kicker">Create Server</span>
                  <input
                    type="text"
                    value={communityServerForm.name}
                    onChange={(event) => setCommunityServerForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Server name"
                  />
                  <textarea
                    value={communityServerForm.description}
                    onChange={(event) => setCommunityServerForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="What is this server for?"
                    rows={3}
                  />
                  <input
                    type="url"
                    value={communityServerForm.inviteUrl}
                    onChange={(event) => setCommunityServerForm((current) => ({ ...current, inviteUrl: event.target.value }))}
                    placeholder="Discord invite URL"
                  />
                  <button className="profile-primary-button small" type="submit">
                    <Plus size={14} />
                    Create Server
                  </button>
                </form>
              </aside>

              <div className="community-main">
                <div className="community-channel-hero">
                  <div>
                    <span className="section-kicker">{activeCommunityServer.joined ? "Joined Server" : "Available Server"}</span>
                    <h2>{activeCommunityServer.name}</h2>
                    <p className="community-server-description">{activeCommunityServer.description}</p>
                  </div>
                  <div className="community-channel-stats">
                    <span aria-label={`${activeCommunityServer.members.toLocaleString()} members`}>
                      <Users size={14} />
                      {activeCommunityServer.members.toLocaleString()}
                    </span>
                    <span aria-label={`${activeCommunityServer.channels.length} channels`}>
                      <Hash size={14} />
                      {activeCommunityServer.channels.length}
                    </span>
                    <span aria-label={`${activeCommunityServer.posts.length} posts`}>
                      <AtSign size={14} />
                      {activeCommunityServer.posts.length}
                    </span>
                    {canDeleteCommunityItem(activeCommunityServer.ownerId) ? (
                      <div className="community-owner-actions">
                        <button className="community-edit-button" type="button" aria-label="Edit server description" onClick={() => editCommunityServerDescription(activeCommunityServer.id)}>
                          <Pencil size={13} />
                        </button>
                        <button className="community-delete-button" type="button" aria-label="Delete server" onClick={() => deleteCommunityServer(activeCommunityServer.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!activeCommunityServer.joined && !joinedCommunityServerIds.includes(activeCommunityServer.id) ? (
                  <div className="profile-empty-card community-join-card">
                    <strong>Join this server to see channels and participate.</strong>
                    <button className="profile-primary-button small" type="button" onClick={() => joinCommunityServer(activeCommunityServer.id)}>
                      Join Server
                    </button>
                  </div>
                ) : (
                  <div className="community-content-grid feed-only">
                    <section className="community-feed-card">
                      <div className="community-card-head">
                        <AtSign size={16} />
                        <strong>Community Feed</strong>
                        <button className="ghost-action community-open-server" type="button" onClick={() => openCommunityServer(activeCommunityServer.id)}>
                          <Hash size={14} />
                          Open Channels
                        </button>
                      </div>

                      <form className="community-post-box" onSubmit={createCommunityPost}>
                        <textarea
                          value={communityPostDraft}
                          onChange={(event) => setCommunityPostDraft(event.target.value)}
                          placeholder={`Post to ${activeCommunityServer.name}...`}
                          rows={4}
                        />
                        <button className="roadmap-cta" type="submit">
                          <Plus size={14} />
                          Post
                        </button>
                      </form>

                      <div className="community-post-list">
                        {activeCommunityServer.posts.length > 0 ? (
                          activeCommunityServer.posts.map((post) => (
                            <article key={post.id} className="community-post">
                              <div className="community-message-meta">
                                <strong>{post.author}</strong>
                                <span>{post.role}</span>
                                <span>Posted {post.time}</span>
                                <span>{post.expiresAt ? `Expires ${formatCommunityTime(post.expiresAt)}` : "Expires in 7 days"}</span>
                                {canDeleteCommunityItem(post.authorId) ? (
                                  <span className="community-owner-actions inline">
                                    <button className="community-edit-button inline" type="button" aria-label="Edit post" onClick={() => editCommunityPost(post.id)}>
                                      <Pencil size={11} />
                                    </button>
                                    <button className="community-delete-button inline" type="button" aria-label="Delete post" onClick={() => deleteCommunityPost(post.id)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </span>
                                ) : null}
                              </div>
                              <p>{post.text}</p>
                              <div className="community-post-actions">
                                <button
                                  className={`community-reaction-button${post.likedByMe ? " active" : ""}`}
                                  type="button"
                                  onClick={() => toggleCommunityPostReaction(post.id)}
                                >
                                  <Heart size={14} />
                                  {post.likes}
                                </button>
                                <span>{post.comments.length} comments</span>
                              </div>

                              <div className="community-comment-list">
                                {post.comments.map((comment) => (
                                  <div key={comment.id} className="community-comment">
                                    <div className="community-comment-meta">
                                      <strong>{comment.author}</strong>
                                      <span>{comment.role}</span>
                                      <span>Posted {comment.time}</span>
                                      <span>{comment.expiresAt ? `Expires ${formatCommunityTime(comment.expiresAt)}` : "Expires in 7 days"}</span>
                                    </div>
                                    {canDeleteCommunityItem(comment.authorId) ? (
                                      <span className="community-owner-actions inline">
                                        <button className="community-edit-button inline" type="button" aria-label="Edit comment" onClick={() => editCommunityComment(post.id, comment.id)}>
                                          <Pencil size={11} />
                                        </button>
                                        <button className="community-delete-button inline" type="button" aria-label="Delete comment" onClick={() => deleteCommunityComment(post.id, comment.id)}>
                                          <Trash2 size={12} />
                                        </button>
                                      </span>
                                    ) : null}
                                    <p>{comment.text}</p>
                                  </div>
                                ))}
                              </div>

                              <form className="community-comment-form" onSubmit={(event) => createCommunityComment(event, post.id)}>
                                <input
                                  type="text"
                                  value={communityCommentDrafts[post.id] ?? ""}
                                  onChange={(event) => setCommunityCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                                  placeholder="Write a comment..."
                                />
                                <button type="submit" aria-label="Post comment">
                                  <Send size={14} />
                                </button>
                              </form>
                            </article>
                          ))
                        ) : (
                          <div className="profile-empty-card">No posts yet. Start the conversation for this server.</div>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!isAdmin && state.activeSidebar === "community" && hasActiveSubscription && !activeCommunityServer && (
          <section className="community-section">
            <div className="applications-head">
              <div>
                <h1>Community</h1>
                <p>Create a server to start the SkillBridge community space.</p>
              </div>
            </div>
            <form className="community-create-card community-empty-create" onSubmit={createCommunityServer}>
              <span className="section-kicker">Create Server</span>
              <input
                type="text"
                value={communityServerForm.name}
                onChange={(event) => setCommunityServerForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Server name"
              />
              <textarea
                value={communityServerForm.description}
                onChange={(event) => setCommunityServerForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What is this server for?"
                rows={3}
              />
              <input
                type="url"
                value={communityServerForm.inviteUrl}
                onChange={(event) => setCommunityServerForm((current) => ({ ...current, inviteUrl: event.target.value }))}
                placeholder="Discord invite URL"
              />
              <button className="profile-primary-button small" type="submit">
                <Plus size={14} />
                Create Server
              </button>
            </form>
          </section>
        )}
      </main>

      <button
        className="support-fab"
        type="button"
        aria-label="Open chat support"
        onClick={() => setSupportPanelOpen(true)}
      >
        <MessageCircle size={22} />
      </button>

      <button
        className="help-fab"
        type="button"
        aria-label="Open help and frequently asked questions"
        onClick={() => setHelpPanelOpen(true)}
      >
        <CircleHelp size={24} />
      </button>

      {helpPanelOpen && (
        <div className="profile-overlay job-modal-overlay help-overlay" onClick={() => setHelpPanelOpen(false)}>
          <aside className="profile-panel job-modal help-panel" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header help-panel-header">
              <div>
                <span className="section-kicker">Help Center</span>
                <h2>Frequently Asked Questions</h2>
              </div>
              <button className="profile-close" type="button" onClick={() => setHelpPanelOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body help-panel-body">
              <div className="help-intro">
                <CircleHelp size={20} />
                <div>
                  <strong>Need a quick guide?</strong>
                  <p>Use these FAQs to navigate SkillBridge and understand the main applicant and admin workflows.</p>
                </div>
              </div>

              <div className="faq-list">
                {helpFaqs.map((item) => (
                  <details key={item.question} className="faq-item">
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {supportPanelOpen && (
        <div className="profile-overlay job-modal-overlay help-overlay" onClick={() => setSupportPanelOpen(false)}>
          <aside className="profile-panel job-modal support-panel" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header help-panel-header">
              <div>
                <span className="section-kicker">Chat Support</span>
                <h2>SkillBridge Support</h2>
              </div>
              <button className="profile-close" type="button" onClick={() => setSupportPanelOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body support-panel-body">
              <div className="support-note">
                <MessageCircle size={18} />
                <p>Send a message to support. Replies are not enabled yet while the support API is pending.</p>
              </div>

              <div className="support-message-list">
                {(state.supportMessages ?? []).length > 0 ? (
                  state.supportMessages.map((message) => (
                    <article key={message.id} className="support-message">
                      <strong>{message.author}</strong>
                      <p>{message.text}</p>
                      <span>{message.time}</span>
                    </article>
                  ))
                ) : (
                  <div className="profile-empty-card">No support messages yet.</div>
                )}
              </div>

              <form className="support-composer" onSubmit={sendSupportMessage}>
                <textarea
                  value={supportMessageDraft}
                  onChange={(event) => setSupportMessageDraft(event.target.value)}
                  placeholder="Describe what you need help with..."
                  rows={4}
                />
                <button className="profile-primary-button" type="submit">
                  <Send size={15} />
                  Send Message
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {communityEditDialog && (
        <div className="profile-overlay job-modal-overlay help-overlay community-edit-overlay" onClick={closeCommunityEditDialog}>
          <aside className="profile-panel community-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header help-panel-header">
              <div>
                <span className="section-kicker">Community Edit</span>
                <h2>{communityEditDialog.title}</h2>
              </div>
              <button className="profile-close" type="button" onClick={closeCommunityEditDialog}>
                <X size={16} />
              </button>
            </div>

            <form className="profile-panel-body community-edit-form" onSubmit={saveCommunityEdit}>
              <label>
                <span>{communityEditDialog.label}</span>
                <textarea
                  value={communityEditValue}
                  onChange={(event) => setCommunityEditValue(event.target.value)}
                  rows={communityEditDialog.rows || 4}
                  autoFocus
                />
              </label>

              {communityEditFeedback ? <p className="form-feedback">{communityEditFeedback}</p> : null}

              <div className="community-edit-actions">
                <button className="ghost-action" type="button" onClick={closeCommunityEditDialog} disabled={communityEditSaving}>
                  Cancel
                </button>
                <button className="roadmap-cta" type="submit" disabled={communityEditSaving}>
                  {communityEditSaving ? "Saving..." : "Save Edit"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {state.community?.activeChatChannelId && activeCommunityServer && (
        <div
          className="profile-overlay job-modal-overlay help-overlay"
          onClick={() =>
            setState((current) => ({
              ...current,
              community: { ...(current.community ?? defaultState.community), activeChatChannelId: "" },
            }))
          }
        >
          <aside className="profile-panel job-modal community-chat-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header help-panel-header">
              <div>
                <span className="section-kicker">Server</span>
                <h2>{activeCommunityServer?.name || "Community Server"}</h2>
              </div>
              <button
                className="profile-close"
                type="button"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    community: { ...(current.community ?? defaultState.community), activeChatChannelId: "" },
                  }))
                }
              >
                <X size={16} />
              </button>
            </div>

            <div className="profile-panel-body community-chat-modal-body">
              <aside className="community-modal-sidebar">
                <div className="community-card-head">
                  <Hash size={16} />
                  <strong>Channels</strong>
                </div>

                <label className="listing-search compact-search community-search" htmlFor="community-channel-search">
                  <Search size={16} />
                  <input
                    id="community-channel-search"
                    value={communityChannelSearchQuery}
                    onChange={(event) => setCommunityChannelSearchQuery(event.target.value)}
                    placeholder="Search channels..."
                  />
                </label>

                <div className="community-channel-list">
                  {filteredCommunityChannels.length > 0 ? (
                    filteredCommunityChannels.map((channel) => (
                      <div key={channel.id} className="community-channel-row">
                        <button
                        className={`community-channel${activeChatChannel?.id === channel.id ? " active" : ""}`}
                        type="button"
                        onClick={() => openCommunityChannel(channel.id)}
                      >
                        <Hash size={15} />
                        <span>{channel.name}</span>
                      </button>
                        {canDeleteCommunityItem(channel.createdBy) ? (
                          <div className="community-owner-actions">
                            <button className="community-edit-button" type="button" aria-label={`Edit ${channel.name}`} onClick={() => editCommunityChannelDescription(channel.id)}>
                              <Pencil size={13} />
                            </button>
                            <button className="community-delete-button" type="button" aria-label={`Delete ${channel.name}`} onClick={() => deleteCommunityChannel(channel.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="profile-empty-card">
                      {communityChannels.length > 0 ? "No channels match your search." : "No channels yet."}
                    </div>
                  )}
                </div>

                <form className="community-create-card" onSubmit={createCommunityChannel}>
                  <span className="section-kicker">Create Channel</span>
                  <input
                    type="text"
                    value={communityChannelForm.name}
                    onChange={(event) => setCommunityChannelForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="channel-name"
                  />
                  <textarea
                    value={communityChannelForm.topic}
                    onChange={(event) => setCommunityChannelForm((current) => ({ ...current, topic: event.target.value }))}
                    placeholder="What is this channel for?"
                    rows={3}
                  />
                  <button className="profile-primary-button small" type="submit">
                    <Plus size={14} />
                    Create Channel
                  </button>
                </form>
              </aside>

              <section className="community-modal-chat">
                <div className="community-modal-chat-head">
                  <span className="section-kicker">{activeChatChannel ? `#${activeChatChannel.name}` : "No channel selected"}</span>
                  <h3>{activeChatChannel?.topic || "Create or select a channel to start chatting."}</h3>
                </div>

                {activeChatChannel ? (
                  <>
                    <div className="community-message-list">
                      {(activeChatChannel.messages ?? []).length > 0 ? (
                        activeChatChannel.messages.map((message) => (
                          <article key={message.id} className="community-message">
                            <div className="community-avatar">{message.author.charAt(0)}</div>
                            <div>
                              <div className="community-message-meta">
                                <strong>{message.author}</strong>
                                <span>{message.role}</span>
                                <span>{message.time}</span>
                                {canDeleteCommunityItem(message.authorId) ? (
                                  <span className="community-owner-actions inline">
                                    <button className="community-edit-button inline" type="button" aria-label="Edit message" onClick={() => editCommunityMessage(message.id)}>
                                      <Pencil size={11} />
                                    </button>
                                    <button className="community-delete-button inline" type="button" aria-label="Delete message" onClick={() => deleteCommunityMessage(message.id)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </span>
                                ) : null}
                              </div>
                              <p>{message.text}</p>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="profile-empty-card">No messages yet. Start the channel chat.</div>
                      )}
                    </div>

                    <form className="community-composer" onSubmit={sendCommunityMessage}>
                      <input
                        type="text"
                        value={communityMessageDraft}
                        onChange={(event) => setCommunityMessageDraft(event.target.value)}
                        placeholder={`Message #${activeChatChannel.name}`}
                      />
                      <button type="submit" aria-label="Send channel message">
                        <Send size={16} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="profile-empty-card">Create a channel from the sidebar to start the server chat.</div>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}

      {activePracticeTest && (
        <div className="profile-overlay job-modal-overlay" onClick={() => setActivePracticeTest(null)}>
          <aside className="profile-panel job-modal practice-test-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-panel-header">
              <div>
                <span className="section-kicker">Practice Test</span>
                <h2>{activePracticeTest.title}</h2>
              </div>
              <button className="profile-close" type="button" onClick={() => setActivePracticeTest(null)}>
                <X size={16} />
              </button>
            </div>

            {(() => {
              const activeQuestions = activePracticeTest.questions ?? defaultPracticeTestQuestions;
              const activeQuestionIndex = Math.min(activePracticeTest.questionIndex ?? 0, activeQuestions.length - 1);
              const activeQuestion = activeQuestions[activeQuestionIndex];
              const activeAnswers = practiceAnswers[activePracticeTest.key] ?? {};
              const selectedAnswer = activeAnswers[activeQuestion.id];

              return (
                <div className="profile-panel-body practice-test-body">
                  <div className="practice-question-stage">
                    <div key={activeQuestion.id} className={`practice-question slide-${activePracticeTest.navDirection ?? "next"}`}>
                      <div className="practice-question-head">
                        <span>Question {activeQuestionIndex + 1}</span>
                        {selectedAnswer !== undefined ? (
                          <strong className={selectedAnswer === activeQuestion.answer ? "mint-text" : "gold-text"}>
                            {selectedAnswer === activeQuestion.answer ? "Correct" : "Review"}
                          </strong>
                        ) : null}
                      </div>
                      <p>{activeQuestion.question}</p>
                      <div className="practice-options">
                        {activeQuestion.options.map((option, optionIndex) => (
                          <button
                            key={option}
                            className={`practice-option${selectedAnswer === optionIndex ? " selected" : ""}${
                              selectedAnswer !== undefined && activeQuestion.answer === optionIndex ? " correct" : ""
                            }`}
                            type="button"
                            onClick={() => {
                              setPracticeAnswers((current) => ({
                                ...current,
                                [activePracticeTest.key]: {
                                  ...(current[activePracticeTest.key] ?? {}),
                                  [activeQuestion.id]: optionIndex,
                                },
                              }));

                              if (activeQuestionIndex < activeQuestions.length - 1) {
                                window.setTimeout(() => {
                                  setActivePracticeTest((current) =>
                                    current?.key === activePracticeTest.key && current.questionIndex === activeQuestionIndex
                                      ? { ...current, questionIndex: Math.min(activeQuestions.length - 1, activeQuestionIndex + 1), navDirection: "next" }
                                      : current,
                                  );
                                }, 450);
                              }
                            }}
                          >
                            <span className="practice-option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                            <span className="practice-option-label">{option}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="practice-question-nav">
                      <button
                        className="practice-arrow-button previous"
                        type="button"
                        aria-label="Previous question"
                        disabled={activeQuestionIndex === 0}
                        onClick={() =>
                          setActivePracticeTest((current) =>
                            current ? { ...current, questionIndex: Math.max(0, activeQuestionIndex - 1), navDirection: "previous" } : current,
                          )
                        }
                      >
                        &lt;
                      </button>
                      <button
                        className="practice-arrow-button next"
                        type="button"
                        aria-label="Next question"
                        disabled={activeQuestionIndex >= activeQuestions.length - 1}
                        onClick={() =>
                          setActivePracticeTest((current) =>
                            current ? { ...current, questionIndex: Math.min(activeQuestions.length - 1, activeQuestionIndex + 1), navDirection: "next" } : current,
                          )
                        }
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </aside>
        </div>
      )}

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

            <div
              className="profile-tab-row"
              style={{
                "--profile-tab-active-index": profileTabIndex,
                "--profile-tab-count": profileTabs.length,
              }}
            >
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

            <div key={state.profilePanelTab} className="profile-panel-body content-appear">
              {authFeedback ? <p className="auth-feedback">{authFeedback}</p> : null}

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
                        <span className={`status-badge ${state.profile.aiProfile.usedFallback ? "reviewed" : "ready"}`}>
                          {state.profile.aiProfile.usedFallback ? "Local Fallback" : "Gemini"}
                        </span>
                      </div>
                      <p>{state.profile.aiProfile.summary}</p>
                      {state.profile.aiProfile.usedFallback && state.profile.aiProfile.parserError && (
                        <p className="ai-empty-note">{state.profile.aiProfile.parserError}</p>
                      )}
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
                      ? "Create your account, then verify it from your email inbox"
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

            <div key={state.authMode} className="profile-panel-body content-appear">
              <form className="profile-section-stack" onSubmit={submitAuth}>
                {(state.authMode === "login" || state.authMode === "signup") && (
                  <div
                    className="auth-switch-row"
                    style={{ "--profile-tab-active-index": authSwitchIndex }}
                  >
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
                        {["Applicant", "Student", "Employer"].map((role) => (
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

                {(state.authMode === "login" || state.authMode === "signup") && (
                  <button className="profile-dashed-button" type="button" onClick={continueWithGoogle}>
                    <Globe size={14} />
                    Continue with Google
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
        <div className={`profile-overlay job-modal-overlay${closingJobModal ? " closing" : ""}`} onClick={closeJobDetails}>
          <aside
            key={selectedJob.id}
            className={`profile-panel job-modal${jobNavigationDirection ? ` job-nav-${jobNavigationDirection}` : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-panel-header">
              <div className="profile-panel-user">
                <div className={`sidebar-avatar large ${selectedJob.accent}`}>{selectedJob.initial}</div>
                <div>
                  <strong>{selectedJob.title}</strong>
                  <span>{selectedJob.company}</span>
                </div>
              </div>
              <div className="job-modal-header-actions">
                <div className="job-modal-navigation" aria-label={`Browse ranked ${selectedJob.category}`}>
                  <button
                    className="job-nav-button"
                    type="button"
                    aria-label={`Previous ranked ${selectedJob.category}`}
                    disabled={selectedRankedJobIndex <= 0}
                    onClick={() => navigateJobDetails(-1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>{selectedRankedJobIndex + 1} / {selectedCategoryRankedListings.length}</span>
                  <button
                    className="job-nav-button"
                    type="button"
                    aria-label={`Next ranked ${selectedJob.category}`}
                    disabled={selectedRankedJobIndex < 0 || selectedRankedJobIndex >= selectedCategoryRankedListings.length - 1}
                    onClick={() => navigateJobDetails(1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button className="profile-close" type="button" onClick={closeJobDetails}>
                  <X size={16} />
                </button>
              </div>
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
                  <MatchScore listing={selectedJob} theme={state.theme} />
                </div>

                {selectedJobRecommendation?.reason && <p className="listing-ai-reason modal-ai-reason">{selectedJobRecommendation.reason}</p>}

                <div className="profile-role-box">
                  <strong>About this job</strong>
                  <span>{getDisplayJobDescription(selectedJob.sourceDescription)}</span>
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
                  <button className="profile-primary-button" type="button" onClick={() => applyToJob(selectedJob)}>
                    Apply on Source Site
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

function normalizeApplicationStageDates(statusTimeline, status = "Applied") {
  if (Array.isArray(statusTimeline) && statusTimeline.length === applicationStages.length) {
    return applicationStages.map((_, index) => String(statusTimeline[index] || ""));
  }

  return createApplicationEntry(status).stageDates;
}

function mapApplicationRecordToState(record) {
  const status = record?.status || "Applied";
  return {
    status,
    appliedDate: record?.applied_at ? getTodayLongDateFromValue(record.applied_at) : getTodayLongDate(),
    stageDates: normalizeApplicationStageDates(record?.status_timeline, status),
  };
}

function hashRoadmapSignature(value) {
  const input = String(value || "");
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }

  return `rm_${Math.abs(hash)}`;
}

function buildRoadmapProfileSignature(profile, roadmapJobs = []) {
  const payload = JSON.stringify({
    role: profile.role || "",
    jobTitle: profile.jobTitle || "",
    about: profile.about || "",
    location: profile.location || "",
    skills: [...(profile.skills ?? [])].map(String).sort(),
    aiProfile: {
      headline: profile.aiProfile?.headline || "",
      summary: profile.aiProfile?.summary || "",
      suggested_roles: [...(profile.aiProfile?.suggested_roles ?? [])].map(String).sort(),
      strengths: [...(profile.aiProfile?.strengths ?? [])].map(String).sort(),
      improvement_skills: [...(profile.aiProfile?.improvement_skills ?? [])].map(String).sort(),
      skills: [...(profile.aiProfile?.skills ?? [])].map(String).sort(),
      sourceFileName: profile.aiProfile?.sourceFileName || "",
    },
    jobs: roadmapJobs.map((job) => ({
      id: String(job.id),
      title: job.title || "",
      company: job.company || "",
      requiredSkills: [...(job.requiredSkills ?? [])].map(String).sort(),
      description: String(job.sourceDescription || job.overview || "").slice(0, 500),
    })),
  });

  return hashRoadmapSignature(payload);
}

function normalizeCachedRoadmapRecord(record) {
  if (!record?.summary) return null;

  try {
    const parsed = JSON.parse(record.summary);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      ...parsed,
      job_id: String(parsed.job_id || record.cacheJobId || ""),
      _source: parsed._source || "ai-enhanced",
    };
  } catch {
    return null;
  }
}

function buildRoadmapCacheTitle(jobId, profileSignature) {
  return `job-cache:${jobId}:${profileSignature}`;
}

function buildRoadmapProgress(completedCount, totalCount) {
  if (totalCount <= 0) {
    return {
      progressPercent: 0,
      progressLabel: "",
    };
  }

  const safeCompleted = Math.max(0, Math.min(completedCount, totalCount));
  return {
    progressPercent: Math.round((safeCompleted / totalCount) * 100),
    progressLabel: `${safeCompleted}/${totalCount} roadmaps enhanced`,
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
