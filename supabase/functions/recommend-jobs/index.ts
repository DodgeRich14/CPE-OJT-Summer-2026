import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001";
const EMBEDDING_BATCH_SIZE = 24;
// Keep Gemini usage bounded while still returning every job through weighted fallback scoring.
const MAX_SEMANTIC_CANDIDATES = 80;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeJsonBlock(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function normalizeSkillForMatch(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const compact = normalized.replace(/[^a-z0-9+#]/g, "");

  return skillAliasMap.get(compact) ?? skillAliasMap.get(normalized) ?? normalized;
}

function skillsMatch(sourceSkill: string, targetSkill: string) {
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

function overlapCount(a: string[], b: string[]) {
  return getOverlapMatches(a, b).length;
}

function getOverlapMatches(sourceSkills: string[], targetSkills: string[]) {
  return targetSkills.filter((skill) => sourceSkills.some((current) => skillsMatch(current, skill)));
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(Math.min(value, max), min);
}

function getSkillEvidenceCeiling(requiredCount: number, matchedCount: number, roleOverlapCount = 0, contextOverlapCount = 0) {
  if (matchedCount <= 0) {
    return clampScore(42 + Math.min(roleOverlapCount * 3, 8) + Math.min(contextOverlapCount, 2) * 2, 0, 98);
  }

  const normalizedRequired = Math.max(requiredCount, matchedCount, 1);
  const coverage = matchedCount / normalizedRequired;
  const ceiling =
    38 +
    matchedCount * 10 +
    coverage * 24 +
    Math.min(roleOverlapCount * 2, 8) +
    Math.min(contextOverlapCount, 2) * 2;

  return clampScore(Math.round(ceiling), 0, 98);
}

function includesAny(haystack: string, keywords: string[]) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

const technicalKeywords = [
  "embedded",
  "firmware",
  "robotics",
  "electronics",
  "electrical",
  "hardware",
  "microcontroller",
  "arduino",
  "raspberry pi",
  "circuit",
  "pcb",
  "iot",
  "mechatronics",
  "automation",
  "control systems",
  "software",
  "developer",
  "engineering",
  "engineer",
  "programming",
  "python",
  "c++",
  "c ",
  "java",
  "react",
  "sql",
  "api",
  "testing",
  "qa",
  "it support",
  "technical support",
  "systems",
  "network",
];

const nonTechnicalKeywords = [
  "hr",
  "human resources",
  "recruitment",
  "recruiter",
  "talent acquisition",
  "admin",
  "administration",
  "administrative",
  "office assistant",
  "clerical",
  "secretary",
  "bookkeeping",
  "accounting",
  "sales",
  "marketing",
  "telemarketing",
  "cashier",
];

const jobSkillDictionary = [
  ...technicalKeywords,
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
];

const genericSkills = new Set(["Communication", "Teamwork", "Documentation", "Excel", "Problem Solving", "Reporting"]);
const seniorRoleKeywords = ["senior", "lead", "principal", "manager", "director", "head", "architect"];
const roleDomainGroups = [
  {
    id: "software",
    keywords: ["react", "javascript", "typescript", "node", "frontend", "backend", "full stack", "software", "developer", "engineer", "programming", "api", "sql", "git", "testing", "qa"],
  },
  {
    id: "embedded",
    keywords: ["embedded", "firmware", "microcontroller", "arduino", "raspberry pi", "robotics", "iot", "electronics", "hardware", "pcb", "circuit", "automation", "control systems"],
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

function isGenericSkill(skill: string) {
  return genericSkills.has(String(skill || "").trim());
}

function countSpecificSkills(skills: string[]) {
  return skills.filter((skill) => !isGenericSkill(skill)).length;
}

function isSeniorRole(...values: string[]) {
  const text = values.join(" ").toLowerCase();
  return seniorRoleKeywords.some((keyword) => text.includes(keyword));
}

function detectRoleDomains(values: string[]) {
  const text = values.join(" ").toLowerCase();
  return roleDomainGroups
    .filter((group) => group.keywords.some((keyword) => text.includes(keyword)))
    .map((group) => group.id);
}

function detectTechnicalFocus(profileSkills: string[], profileText: string) {
  const combined = `${profileSkills.join(" ")} ${profileText}`.toLowerCase();
  return includesAny(combined, technicalKeywords);
}

function isJuniorProfile(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>) {
  const years = Number(resumeProfile.experience_years ?? 0);
  if (Number.isFinite(years) && years > 0) return years < 3;

  const title = String(profile.jobTitle ?? "").toLowerCase();
  const summary = String(resumeProfile.summary ?? "").toLowerCase();
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

function getDomainPenalty(
  profile: Record<string, unknown>,
  resumeProfile: Record<string, unknown>,
  job: Record<string, unknown>,
  matchedSkills: string[],
  requiredSkills: string[],
) {
  const applicantDomains = detectRoleDomains([
    String(profile.jobTitle ?? ""),
    String(profile.about ?? ""),
    ...((profile.skills ?? []) as string[]),
    ...((resumeProfile.suggested_roles ?? []) as string[]),
    String(resumeProfile.summary ?? ""),
  ]);
  const listingDomains = detectRoleDomains([
    String(job.title ?? ""),
    String(job.description ?? ""),
    String(job.category ?? ""),
    ...requiredSkills,
    ...((job.responsibilities ?? []) as string[]),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 0;
  if (applicantDomains.some((domain) => listingDomains.includes(domain))) return 0;

  const specificMatchedCount = countSpecificSkills(matchedSkills);
  return specificMatchedCount === 0 ? 22 : 12;
}

function getDomainMatchBonus(
  profile: Record<string, unknown>,
  resumeProfile: Record<string, unknown>,
  job: Record<string, unknown>,
  requiredSkills: string[],
) {
  const applicantDomains = detectRoleDomains([
    String(profile.jobTitle ?? ""),
    String(profile.about ?? ""),
    ...((profile.skills ?? []) as string[]),
    ...((resumeProfile.suggested_roles ?? []) as string[]),
    String(resumeProfile.summary ?? ""),
  ]);
  const listingDomains = detectRoleDomains([
    String(job.title ?? ""),
    String(job.description ?? ""),
    String(job.category ?? ""),
    ...requiredSkills,
    ...((job.responsibilities ?? []) as string[]),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 0;
  return applicantDomains.some((domain) => listingDomains.includes(domain)) ? 8 : 0;
}

function getDomainAlignmentScore(
  profile: Record<string, unknown>,
  resumeProfile: Record<string, unknown>,
  job: Record<string, unknown>,
  matchedSkills: string[],
  requiredSkills: string[],
) {
  const applicantDomains = detectRoleDomains([
    String(profile.jobTitle ?? ""),
    String(profile.about ?? ""),
    ...((profile.skills ?? []) as string[]),
    ...((resumeProfile.suggested_roles ?? []) as string[]),
    String(resumeProfile.summary ?? ""),
  ]);
  const listingDomains = detectRoleDomains([
    String(job.title ?? ""),
    String(job.description ?? ""),
    String(job.category ?? ""),
    ...requiredSkills,
    ...((job.responsibilities ?? []) as string[]),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 60;
  if (applicantDomains.some((domain) => listingDomains.includes(domain))) return 100;
  return countSpecificSkills(matchedSkills) > 0 ? 35 : 10;
}

function getExperienceAlignmentScore(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>, job: Record<string, unknown>) {
  const juniorProfile = isJuniorProfile(profile, resumeProfile);
  const seniorRole = isSeniorRole(String(job.title ?? ""), String(job.description ?? ""));

  if (juniorProfile && seniorRole) return 20;
  if (!juniorProfile && seniorRole) return 90;
  return 82;
}

function computeWeightedAverageScore(components: Array<{ score: number; weight: number }>) {
  const weightedTotal = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return totalWeight > 0 ? weightedTotal / totalWeight : 0;
}

function filterSpecificMatchedSkills(skills: string[]) {
  return Array.from(new Set(skills.filter((skill) => !isGenericSkill(skill))));
}

function computeJobTitleMatchScore(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>, job: Record<string, unknown>) {
  const targetRoles = [String(profile.jobTitle ?? ""), ...((resumeProfile.suggested_roles ?? []) as string[])].filter(Boolean);
  const roleTerms = targetRoles
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9+#.]+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  const titleTerms = String(job.title ?? "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  if (roleTerms.length === 0) return 50;

  const overlap = roleTerms.filter((term) => titleTerms.includes(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(roleTerms.length, 1)) * 100 : 8;

  if (isJuniorProfile(profile, resumeProfile) && isSeniorRole(String(job.title ?? ""))) {
    score = Math.min(score, 22);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeDescriptionSimilarityScore(
  profile: Record<string, unknown>,
  resumeProfile: Record<string, unknown>,
  job: Record<string, unknown>,
  requiredSkills: string[],
  matchedSkills: string[],
) {
  const applicantTerms = [
    String(profile.about ?? ""),
    String(resumeProfile.summary ?? ""),
    ...((resumeProfile.strengths ?? []) as string[]),
    ...((resumeProfile.keywords ?? []) as string[]),
    ...filterSpecificMatchedSkills((profile.skills ?? []) as string[]),
  ]
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9+#.]+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  const descriptionTerms = new Set(
    [String(job.description ?? ""), ...((job.responsibilities ?? []) as string[]), ...requiredSkills]
      .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9+#.]+/))
      .map((term) => term.trim())
      .filter((term) => term.length >= 3),
  );

  if (applicantTerms.length === 0) return 45;

  const overlap = applicantTerms.filter((term) => descriptionTerms.has(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(Math.min(applicantTerms.length, 12), 1)) * 100 : 10;

  if (getDomainAlignmentScore(profile, resumeProfile, job, matchedSkills, requiredSkills) < 40) {
    score = Math.min(score, countSpecificSkills(matchedSkills) > 0 ? 42 : 18);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeLocationMatchScore(profile: Record<string, unknown>, job: Record<string, unknown>) {
  const profileLocation = String(profile.location ?? "").trim().toLowerCase();
  const listingText = `${String(job.location ?? "")} ${String(job.work_type ?? "")}`.toLowerCase();

  if (!profileLocation) return 55;
  if (listingText.includes(profileLocation)) return 100;
  if (listingText.includes("remote")) return 80;
  if (listingText.includes("hybrid")) return 65;
  return 20;
}

function computeFreshnessScore(postedAt: unknown) {
  if (!postedAt) return 45;

  const date = new Date(String(postedAt));
  if (Number.isNaN(date.getTime())) return 45;

  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 100;
  if (diffDays === 1) return 95;
  if (diffDays <= 3) return 90;
  if (diffDays <= 7) return 80;
  if (diffDays <= 14) return 68;
  if (diffDays <= 30) return 55;
  return 40;
}

function computeJobTitleMatchScore(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>, job: Record<string, unknown>) {
  const targetRoles = [String(profile.jobTitle ?? ""), ...((resumeProfile.suggested_roles ?? []) as string[])].filter(Boolean);
  const roleTerms = targetRoles
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9+#.]+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  const titleTerms = String(job.title ?? "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  if (roleTerms.length === 0) return 50;

  const overlap = roleTerms.filter((term) => titleTerms.includes(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(roleTerms.length, 1)) * 100 : 8;

  if (isJuniorProfile(profile, resumeProfile) && isSeniorRole(String(job.title ?? ""))) {
    score = Math.min(score, 22);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeDescriptionSimilarityScore(
  profile: Record<string, unknown>,
  resumeProfile: Record<string, unknown>,
  job: Record<string, unknown>,
  requiredSkills: string[],
  matchedSkills: string[],
) {
  const applicantTerms = [
    String(profile.about ?? ""),
    String(resumeProfile.summary ?? ""),
    ...((resumeProfile.strengths ?? []) as string[]),
    ...((resumeProfile.keywords ?? []) as string[]),
    ...filterSpecificMatchedSkills((profile.skills ?? []) as string[]),
  ]
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9+#.]+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  const descriptionTerms = new Set(
    [String(job.description ?? ""), ...((job.responsibilities ?? []) as string[]), ...requiredSkills]
      .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9+#.]+/))
      .map((term) => term.trim())
      .filter((term) => term.length >= 3),
  );

  if (applicantTerms.length === 0) return 45;

  const overlap = applicantTerms.filter((term) => descriptionTerms.has(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(Math.min(applicantTerms.length, 12), 1)) * 100 : 10;

  if (getDomainAlignmentScore(profile, resumeProfile, job, matchedSkills, requiredSkills) < 40) {
    score = Math.min(score, countSpecificSkills(matchedSkills) > 0 ? 42 : 18);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeLocationMatchScore(profile: Record<string, unknown>, job: Record<string, unknown>) {
  const profileLocation = String(profile.location ?? "").trim().toLowerCase();
  const listingText = `${String(job.location ?? "")} ${String(job.work_type ?? "")}`.toLowerCase();

  if (!profileLocation) return 55;
  if (listingText.includes(profileLocation)) return 100;
  if (listingText.includes("remote")) return 80;
  if (listingText.includes("hybrid")) return 65;
  return 20;
}

function computeFreshnessScore(postedAt: unknown) {
  if (!postedAt) return 45;

  const date = new Date(String(postedAt));
  if (Number.isNaN(date.getTime())) return 45;

  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 100;
  if (diffDays === 1) return 95;
  if (diffDays <= 3) return 90;
  if (diffDays <= 7) return 80;
  if (diffDays <= 14) return 68;
  if (diffDays <= 30) return 55;
  return 40;
}

function trimEmbeddingText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 6000);
}

function buildApplicantEmbeddingText(
  profile: Record<string, unknown>,
  resumeProfile: Record<string, unknown>,
  profileSkills: string[],
) {
  return trimEmbeddingText(
    [
      `Target role: ${String(profile.jobTitle ?? "")}`,
      `Location: ${String(profile.location ?? "")}`,
      `Skills: ${profileSkills.join(", ")}`,
      `Profile: ${String(profile.about ?? "")}`,
      `Resume summary: ${String(resumeProfile.summary ?? "")}`,
      `Suggested roles: ${((resumeProfile.suggested_roles ?? []) as string[]).join(", ")}`,
      `Strengths: ${((resumeProfile.strengths ?? []) as string[]).join(", ")}`,
      `Keywords: ${((resumeProfile.keywords ?? []) as string[]).join(", ")}`,
    ].join("\n"),
  );
}

function buildApplicantTitleText(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>) {
  return trimEmbeddingText(
    [
      String(profile.jobTitle ?? ""),
      ...((resumeProfile.suggested_roles ?? []) as string[]),
      String(resumeProfile.summary ?? ""),
    ].join(" | "),
  );
}

function buildJobEmbeddingText(job: Record<string, unknown>, requiredSkills: string[]) {
  return trimEmbeddingText(
    [
      `Job title: ${String(job.title ?? "")}`,
      `Company: ${String(job.company_name ?? "")}`,
      `Category: ${String(job.category ?? "")}`,
      `Location: ${String(job.location ?? "")}`,
      `Work type: ${String(job.work_type ?? "")}`,
      `Required skills: ${requiredSkills.join(", ")}`,
      `Description: ${String(job.description ?? "")}`,
      `Responsibilities: ${((job.responsibilities ?? []) as string[]).join(", ")}`,
    ].join("\n"),
  );
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) return null;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return null;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function semanticSimilarityToScore(similarity: number | null) {
  if (similarity === null || !Number.isFinite(similarity)) return null;

  // Gemini text embeddings often cluster above zero, so stretch the useful range for clearer ranking.
  return clampScore(Math.round(((similarity - 0.52) / 0.36) * 100), 0, 100);
}

async function callGeminiEmbeddings(texts: string[]) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey || texts.length === 0) {
    return null;
  }

  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const chunk = texts.slice(index, index + EMBEDDING_BATCH_SIZE);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          requests: chunk.map((text) => ({
            model: GEMINI_EMBEDDING_MODEL,
            taskType: "SEMANTIC_SIMILARITY",
            content: {
              parts: [{ text: trimEmbeddingText(text) || "empty" }],
            },
          })),
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini embeddings request failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const chunkEmbeddings = (payload.embeddings ?? [])
      .map((item: Record<string, unknown>) => (item.values ?? []) as number[])
      .filter((values: number[]) => values.length > 0);

    if (chunkEmbeddings.length !== chunk.length) {
      throw new Error("Gemini embeddings returned an incomplete batch.");
    }

    embeddings.push(...chunkEmbeddings);
  }

  return embeddings;
}

function buildRecommendationReason(
  job: Record<string, unknown>,
  matchedSkills: string[],
  skillGaps: string[],
  descriptionSimilarityScore: number,
) {
  const matchedText =
    matchedSkills.length > 0
      ? `It matches your profile through ${matchedSkills.slice(0, 3).join(", ")}`
      : "It has a related career direction, though your direct saved skill evidence is still light";
  const gapText =
    skillGaps.length > 0
      ? `Key gaps to prepare for are ${skillGaps.slice(0, 3).join(", ")}.`
      : "Your saved skills cover the main requirements listed by the employer.";
  const confidenceText =
    descriptionSimilarityScore >= 70
      ? "The job description is semantically close to your resume summary and career direction."
      : "The role is ranked lower when the description drifts away from your resume focus.";

  return `${matchedText} for ${String(job.title ?? "this role")} at ${String(job.company_name ?? "the employer")}. ${confidenceText} ${gapText}`;
}

async function loadOpenJobs(
  supabase: ReturnType<typeof createClient>,
  category: string | null,
) {
  let query = supabase
    .from("jobs")
    .select("id, title, company_name, category, location, work_type, description, responsibilities, required_skills, posted_at, source_platform, source_url")
    .eq("status", "Open")
    .eq("review_status", "Approved")
    .order("posted_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function buildJobSearchText(job: Record<string, unknown>) {
  return [
    String(job.title ?? ""),
    String(job.description ?? ""),
    ...((job.required_skills as string[] | undefined) ?? []),
    ...((job.responsibilities as string[] | undefined) ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function isClearlyNonTechnical(jobText: string) {
  return includesAny(jobText, nonTechnicalKeywords) && !includesAny(jobText, technicalKeywords);
}

function inferJobSkills(job: Record<string, unknown>) {
  const existingSkills = Array.isArray(job.required_skills) ? (job.required_skills as string[]).filter(Boolean) : [];
  if (existingSkills.length > 0) return existingSkills;

  const lowered = [
    String(job.title ?? ""),
    String(job.description ?? ""),
    ...((job.responsibilities as string[] | undefined) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return dedupe(
    jobSkillDictionary.filter((skill) => lowered.includes(skill)).map((skill) => {
      if (skill === "node") return "Node.js";
      if (skill === "hr") return "HR";
      if (skill === "crm") return "CRM";
      return titleCase(skill);
    }),
  );
}

async function callGemini(prompt: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in Supabase secrets.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(normalizeJsonBlock(text));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const profile = body.profile ?? {};
    const resumeProfile = body.resumeProfile ?? {};
    const category = body.category ? String(body.category) : null;
    const profileSkills = dedupe([...(profile.skills ?? [])]);
    const profileText = [
      String(profile.jobTitle ?? ""),
      String(profile.about ?? ""),
      String(resumeProfile.summary ?? ""),
      ...((resumeProfile.suggested_roles ?? []) as string[]),
      ...((resumeProfile.strengths ?? []) as string[]),
    ]
      .join(" ")
      .toLowerCase();
    const technicalFocus = detectTechnicalFocus(profileSkills, profileText);
    const juniorProfile = isJuniorProfile(profile as Record<string, unknown>, resumeProfile as Record<string, unknown>);

    if (profileSkills.length === 0 && !resumeProfile.summary) {
      return jsonResponse({ error: "Profile data is required for recommendations." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service credentials are missing.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const jobs = await loadOpenJobs(supabase, category);

    const candidateJobs = (jobs ?? [])
      .map((job) => {
        const requiredSkills = inferJobSkills(job as Record<string, unknown>);
        const jobText = buildJobSearchText(job as Record<string, unknown>);
        const baseOverlap = overlapCount(profileSkills, requiredSkills);
        const technicalSignal = includesAny(jobText, technicalKeywords);
        const nonTechnicalSignal = isClearlyNonTechnical(jobText);
        const roleOverlap = overlapCount(
          dedupe([String(profile.jobTitle ?? ""), ...((resumeProfile.suggested_roles ?? []) as string[])]),
          [String(job.title ?? ""), String(job.category ?? ""), String(job.work_type ?? "")],
        );

        return {
          ...job,
          required_skills: requiredSkills,
          baseOverlap,
          roleOverlap,
          technicalSignal,
          nonTechnicalSignal,
          heuristicScore:
            baseOverlap * 20 +
            roleOverlap * 8 +
            (technicalSignal ? 14 : 0) -
            (nonTechnicalSignal ? 30 : 0),
        };
      })
      .sort((left, right) => right.heuristicScore - left.heuristicScore);

    if (candidateJobs.length === 0) {
      return jsonResponse({ success: true, recommendations: [] });
    }

    const applicantEmbeddingText = buildApplicantEmbeddingText(
      profile as Record<string, unknown>,
      resumeProfile as Record<string, unknown>,
      profileSkills,
    );
    const applicantTitleText = buildApplicantTitleText(
      profile as Record<string, unknown>,
      resumeProfile as Record<string, unknown>,
    );
    const semanticCandidateJobs = candidateJobs.slice(0, MAX_SEMANTIC_CANDIDATES);
    const jobEmbeddingTexts = semanticCandidateJobs.map((job) =>
      buildJobEmbeddingText(job as Record<string, unknown>, (job.required_skills ?? []) as string[]),
    );
    const jobTitleTexts = semanticCandidateJobs.map((job) => trimEmbeddingText(String(job.title ?? "")));
    let applicantEmbedding: number[] | null = null;
    let applicantTitleEmbedding: number[] | null = null;
    let jobEmbeddings: number[][] = [];
    let jobTitleEmbeddings: number[][] = [];

    try {
      const embeddings = await callGeminiEmbeddings([
        applicantEmbeddingText,
        applicantTitleText || applicantEmbeddingText,
        ...jobEmbeddingTexts,
        ...jobTitleTexts,
      ]);

      if (embeddings) {
        applicantEmbedding = embeddings[0] ?? null;
        applicantTitleEmbedding = embeddings[1] ?? null;
        jobEmbeddings = embeddings.slice(2, 2 + semanticCandidateJobs.length);
        jobTitleEmbeddings = embeddings.slice(2 + semanticCandidateJobs.length);
      }
    } catch (embeddingError) {
      console.error(embeddingError);
    }

    const recommendations = candidateJobs
      .map((job, index) => {
        const rawMatchedSkills = dedupe(getOverlapMatches(profileSkills, (job.required_skills ?? []) as string[]));
        const matchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);
        const skillGaps = dedupe(((job.required_skills ?? []) as string[]).filter(
          (skill) => !rawMatchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase()),
        ));
        const domainAlignmentScore = getDomainAlignmentScore(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
          rawMatchedSkills,
          (job.required_skills ?? []) as string[],
        );
        const specificMatchedCount = countSpecificSkills(matchedSkills);
        const experienceAlignmentScore = getExperienceAlignmentScore(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
        );
        const specificRequiredSkills = ((job.required_skills ?? []) as string[]).filter((skill) => !isGenericSkill(skill));
        const genericRequiredSkills = ((job.required_skills ?? []) as string[]).filter((skill) => isGenericSkill(skill));
        const specificMatchedSkills = matchedSkills;
        const genericMatchedSkills = rawMatchedSkills.filter((skill) => isGenericSkill(skill));
        const specificCoverage =
          specificRequiredSkills.length > 0
            ? specificMatchedSkills.length / specificRequiredSkills.length
            : specificMatchedSkills.length > 0
              ? 0.45
              : 0;
        const genericCoverage =
          genericRequiredSkills.length > 0
            ? genericMatchedSkills.length / genericRequiredSkills.length
            : genericMatchedSkills.length > 0
              ? 0.35
              : 0;
        const skillAlignmentScore = clampScore(Math.round(specificCoverage * 85 + genericCoverage * 15), 0, 100);
        const fallbackTitleMatchScore = computeJobTitleMatchScore(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
        );
        const fallbackDescriptionSimilarityScore = computeDescriptionSimilarityScore(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
          (job.required_skills ?? []) as string[],
          rawMatchedSkills,
        );
        const titleMatchScore =
          semanticSimilarityToScore(cosineSimilarity(applicantTitleEmbedding ?? [], jobTitleEmbeddings[index] ?? [])) ??
          fallbackTitleMatchScore;
        const descriptionSimilarityScore =
          semanticSimilarityToScore(cosineSimilarity(applicantEmbedding ?? [], jobEmbeddings[index] ?? [])) ??
          fallbackDescriptionSimilarityScore;
        const locationMatchScore = computeLocationMatchScore(
          profile as Record<string, unknown>,
          job as Record<string, unknown>,
        );
        const freshnessScore = computeFreshnessScore(job.posted_at);
        let deterministicScore = Math.round(
          computeWeightedAverageScore([
            { score: titleMatchScore, weight: 0.35 },
            { score: skillAlignmentScore, weight: 0.3 },
            { score: descriptionSimilarityScore, weight: 0.2 },
            { score: locationMatchScore, weight: 0.1 },
            { score: freshnessScore, weight: 0.05 },
          ]),
        );
        if (profileSkills.length > 0 && specificMatchedSkills.length === 0) {
          deterministicScore = Math.min(deterministicScore, genericMatchedSkills.length > 0 ? 58 : 52);
        }
        if (specificRequiredSkills.length > 0 && specificMatchedSkills.length === 0) {
          deterministicScore = Math.min(deterministicScore, 56);
        }
        if (domainAlignmentScore < 40) {
          deterministicScore = Math.min(deterministicScore, specificMatchedSkills.length > 0 ? 58 : 42);
        }
        if (experienceAlignmentScore <= 20) {
          deterministicScore = Math.min(deterministicScore, 42);
        }
        deterministicScore = clampScore(deterministicScore, 0, 100);

        return {
          job,
          job_id: job.id,
          match_score: deterministicScore,
          score_breakdown: {
            job_title_match: Math.round(titleMatchScore),
            skill_match: Math.round(skillAlignmentScore),
            description_similarity: Math.round(descriptionSimilarityScore),
            location_match: Math.round(locationMatchScore),
            freshness: Math.round(freshnessScore),
          },
          matched_skills: rawMatchedSkills,
          skill_gaps: skillGaps,
          reason: buildRecommendationReason(job as Record<string, unknown>, matchedSkills, skillGaps, descriptionSimilarityScore),
        };
      })
      .sort((left, right) => right.match_score - left.match_score);

    return jsonResponse({
      success: true,
      recommendations,
      model: applicantEmbedding ? "gemini-embedding-001" : "weighted-fallback",
      semantic_candidates: applicantEmbedding ? semanticCandidateJobs.length : 0,
      total_candidates: candidateJobs.length,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Recommendation failed.",
      },
      500,
    );
  }
});
