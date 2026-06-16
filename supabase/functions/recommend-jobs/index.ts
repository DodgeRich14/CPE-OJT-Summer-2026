import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

const jobSkillDictionary = [
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

const GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001";
const MAX_DESCRIPTION_CHARS = 1200;
const MAX_RESPONSIBILITIES = 4;
const MAX_RESPONSIBILITY_CHARS = 220;
const MAX_SEMANTIC_CANDIDATES = 12;
const EMBEDDING_BATCH_SIZE = 8;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function compactText(value: unknown, maxChars: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(Math.min(value, max), min);
}

function trimEmbeddingText(value: string, maxChars = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function isGenericSkill(skill: string) {
  return genericSkills.has(String(skill || "").trim());
}

function countSpecificSkills(skills: string[]) {
  return skills.filter((skill) => !isGenericSkill(skill)).length;
}

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

function getOverlapMatches(sourceSkills: string[], targetSkills: string[]) {
  return targetSkills.filter((skill) => sourceSkills.some((current) => skillsMatch(current, skill)));
}

function includesAny(haystack: string, keywords: string[]) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function detectRoleDomains(values: string[]) {
  const text = values.join(" ").toLowerCase();
  return roleDomainGroups
    .filter((group) => group.keywords.some((keyword) => text.includes(keyword)))
    .map((group) => group.id);
}

function isSeniorRole(...values: string[]) {
  const text = values.join(" ").toLowerCase();
  return seniorRoleKeywords.some((keyword) => text.includes(keyword));
}

function isJuniorProfile(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>) {
  const targetYears = Number(resumeProfile.experience_years ?? 0);
  const titleText = `${String(profile.jobTitle ?? "")} ${String(resumeProfile.summary ?? "")}`.toLowerCase();
  return targetYears <= 2 || titleText.includes("student") || titleText.includes("intern") || titleText.includes("ojt") || titleText.includes("entry");
}

function computeWeightedAverageScore(components: Array<{ score: number; weight: number }>) {
  const weightedTotal = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return totalWeight > 0 ? weightedTotal / totalWeight : 0;
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

function cosineSimilarity(a: number[], b: number[]) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return null;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    magA += left * left;
    magB += right * right;
  }

  if (magA === 0 || magB === 0) return null;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function semanticSimilarityToScore(similarity: number | null) {
  if (similarity === null || Number.isNaN(similarity)) return null;
  const normalized = (similarity + 1) / 2;
  const stretched = Math.max(0, Math.min(1, (normalized - 0.35) / 0.55));
  return clampScore(Math.round(28 + stretched * 72), 0, 100);
}

function buildApplicantEmbeddingText(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>, profileSkills: string[]) {
  return trimEmbeddingText(
    [
      `Target role: ${String(profile.jobTitle ?? "")}`,
      `Profile summary: ${String(profile.about ?? "")}`,
      `Resume summary: ${String(resumeProfile.summary ?? "")}`,
      `Suggested roles: ${Array.isArray(resumeProfile.suggested_roles) ? resumeProfile.suggested_roles.join(", ") : ""}`,
      `Skills: ${profileSkills.join(", ")}`,
      `Strengths: ${Array.isArray(resumeProfile.strengths) ? resumeProfile.strengths.join(", ") : ""}`,
    ].join("\n"),
    1100,
  );
}

function buildJobEmbeddingText(job: Record<string, unknown>, requiredSkills: string[]) {
  return trimEmbeddingText(
    [
      `Job title: ${String(job.title ?? "")}`,
      `Category: ${String(job.category ?? "")}`,
      `Location: ${String(job.location ?? "")}`,
      `Work type: ${String(job.work_type ?? "")}`,
      `Required skills: ${requiredSkills.join(", ")}`,
      `Description: ${compactText(job.description, 420)}`,
    ].join("\n"),
    900,
  );
}

async function callGeminiEmbeddings(texts: string[]) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || texts.length === 0) return null;

  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBEDDING_BATCH_SIZE).filter(Boolean);
    if (batch.length === 0) continue;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: GEMINI_EMBEDDING_MODEL,
            content: {
              parts: [{ text }],
            },
            taskType: "SEMANTIC_SIMILARITY",
          })),
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini embeddings request failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const batchEmbeddings = (payload.embeddings ?? [])
      .map((entry: { values?: number[] }) => entry?.values ?? [])
      .filter((entry: number[]) => Array.isArray(entry) && entry.length > 0);

    if (batchEmbeddings.length !== batch.length) {
      throw new Error("Gemini embeddings returned an incomplete batch.");
    }

    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

function inferJobSkills(job: Record<string, unknown>) {
  const existingSkills = Array.isArray(job.required_skills) ? job.required_skills.map((skill) => String(skill || "").trim()).filter(Boolean) : [];
  if (existingSkills.length > 0) return dedupe(existingSkills);

  const text = [
    String(job.title ?? ""),
    String(job.description ?? ""),
    String(job.category ?? ""),
    ...((job.responsibilities ?? []) as string[]),
  ]
    .join(" ")
    .toLowerCase();

  return dedupe(
    jobSkillDictionary
      .filter((skill) => text.includes(skill))
      .map((skill) => {
        if (skill === "node") return "Node.js";
        if (skill === "next") return "Next.js";
        if (skill === "javascript") return "JavaScript";
        if (skill === "typescript") return "TypeScript";
        if (skill === "react") return "React";
        if (skill === "sql") return "SQL";
        if (skill === "postgresql") return "PostgreSQL";
        if (skill === "mysql") return "MySQL";
        if (skill === "graphql") return "GraphQL";
        if (skill === "aws") return "AWS";
        if (skill === "css") return "CSS";
        if (skill === "html") return "HTML";
        if (skill === "api") return "API";
        if (skill === "hr") return "HR";
        return skill
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }),
  );
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

  if (isJuniorProfile(profile, resumeProfile) && isSeniorRole(String(job.title ?? ""), String(job.description ?? ""))) {
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
    ...((profile.skills ?? []) as string[]),
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

function buildRecommendationReason(job: Record<string, unknown>, matchedSkills: string[], skillGaps: string[], descriptionSimilarityScore: number) {
  if (matchedSkills.length > 0) {
    return `Fallback ranking kept this role high because your profile overlaps with ${matchedSkills.slice(0, 3).join(", ")} and the role direction still lines up with your current focus.`;
  }

  if (skillGaps.length > 0 && descriptionSimilarityScore >= 55) {
    return `Fallback ranking kept this role visible because the role direction still lines up with your current focus, but you may need to strengthen ${skillGaps.slice(0, 3).join(", ")}.`;
  }

  return "Fallback ranking kept this role visible because the role title and description still align with your current direction, even though the explicit skill overlap is limited.";
}

async function loadOpenJobs(supabase: ReturnType<typeof createClient>, category: string | null) {
  let query = supabase
    .from("jobs")
    .select("id, title, category, location, work_type, description, responsibilities, required_skills, posted_at")
    .eq("status", "Open")
    .eq("review_status", "Approved")
    .order("posted_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Unable to load jobs.");
  }

  return (data ?? []).map((job) => ({
    ...job,
    title: compactText(job.title, 180),
    category: compactText(job.category, 80),
    location: compactText(job.location, 120),
    work_type: compactText(job.work_type, 80),
    description: compactText(job.description, MAX_DESCRIPTION_CHARS),
    responsibilities: Array.isArray(job.responsibilities)
      ? job.responsibilities
          .slice(0, MAX_RESPONSIBILITIES)
          .map((item) => compactText(item, MAX_RESPONSIBILITY_CHARS))
          .filter(Boolean)
      : [],
    required_skills: Array.isArray(job.required_skills)
      ? job.required_skills.slice(0, 16).map((item) => compactText(item, 60)).filter(Boolean)
      : [],
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const { profile = {}, resumeProfile = {}, category = null } = await req.json();
    const profileSkills = dedupe(Array.isArray(profile.skills) ? profile.skills : []);

    if (profileSkills.length === 0 && !resumeProfile?.summary) {
      return jsonResponse({ error: "Profile data is required for recommendations." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service credentials are missing.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const jobs = await loadOpenJobs(supabase, category);

    const candidateJobs = jobs
      .map((job) => {
        const requiredSkills = inferJobSkills(job as Record<string, unknown>);
        const rawMatchedSkills = dedupe(getOverlapMatches(profileSkills, requiredSkills));
        const titleMatchScore = computeJobTitleMatchScore(profile, resumeProfile, job);
        const domainAlignmentScore = getDomainAlignmentScore(profile, resumeProfile, job, rawMatchedSkills, requiredSkills);
        const heuristicScore = rawMatchedSkills.length * 18 + titleMatchScore * 0.45 + domainAlignmentScore * 0.12;

        return {
          ...job,
          required_skills: requiredSkills,
          rawMatchedSkills,
          heuristicScore,
        };
      })
      .sort((left, right) => right.heuristicScore - left.heuristicScore);

    let applicantEmbedding: number[] | null = null;
    let semanticJobEmbeddings: number[][] = [];
    const semanticCandidateJobs = candidateJobs.slice(0, MAX_SEMANTIC_CANDIDATES);

    try {
      const applicantEmbeddingText = buildApplicantEmbeddingText(profile, resumeProfile, profileSkills);
      const jobEmbeddingTexts = semanticCandidateJobs.map((job) =>
        buildJobEmbeddingText(job as Record<string, unknown>, (job.required_skills ?? []) as string[]),
      );
      const embeddings = await callGeminiEmbeddings([applicantEmbeddingText, ...jobEmbeddingTexts]);

      if (embeddings && embeddings.length >= 1) {
        applicantEmbedding = embeddings[0] ?? null;
        semanticJobEmbeddings = embeddings.slice(1);
      }
    } catch (embeddingError) {
      console.error(embeddingError);
    }

    const recommendations = candidateJobs
      .map((job, index) => {
        const requiredSkills = (job.required_skills ?? []) as string[];
        const rawMatchedSkills = Array.isArray(job.rawMatchedSkills) ? job.rawMatchedSkills : dedupe(getOverlapMatches(profileSkills, requiredSkills));
        const matchedSkills = rawMatchedSkills.filter((skill) => !isGenericSkill(skill));
        const skillGaps = dedupe(requiredSkills.filter((skill) => !rawMatchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase())));

        const titleMatchScore = computeJobTitleMatchScore(profile, resumeProfile, job);
        const specificRequiredSkills = requiredSkills.filter((skill) => !isGenericSkill(skill));
        const genericRequiredSkills = requiredSkills.filter((skill) => isGenericSkill(skill));
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
        const fallbackDescriptionSimilarityScore = computeDescriptionSimilarityScore(profile, resumeProfile, job, requiredSkills, rawMatchedSkills);
        const descriptionSimilarityScore =
          index < semanticCandidateJobs.length && applicantEmbedding && semanticJobEmbeddings[index]
            ? semanticSimilarityToScore(cosineSimilarity(applicantEmbedding, semanticJobEmbeddings[index])) ?? fallbackDescriptionSimilarityScore
            : fallbackDescriptionSimilarityScore;
        const domainAlignmentScore = getDomainAlignmentScore(profile, resumeProfile, job, rawMatchedSkills, requiredSkills);
        const experienceAlignmentScore = getExperienceAlignmentScore(profile, resumeProfile, job);

        let matchScore = Math.round(
          computeWeightedAverageScore([
            { score: titleMatchScore, weight: 0.35 },
            { score: skillAlignmentScore, weight: 0.4 },
            { score: descriptionSimilarityScore, weight: 0.25 },
          ]),
        );

        if (profileSkills.length > 0 && specificMatchedSkills.length === 0) {
          matchScore = Math.min(matchScore, genericMatchedSkills.length > 0 ? 58 : 52);
        }
        if (specificRequiredSkills.length > 0 && specificMatchedSkills.length === 0) {
          matchScore = Math.min(matchScore, 56);
        }
        if (domainAlignmentScore < 40) {
          matchScore = Math.min(matchScore, specificMatchedSkills.length > 0 ? 58 : 42);
        }
        if (experienceAlignmentScore <= 20) {
          matchScore = Math.min(matchScore, 42);
        }

        const roleOverlap = getOverlapMatches(
          dedupe([String(profile.jobTitle ?? ""), ...((resumeProfile.suggested_roles ?? []) as string[])]),
          [String(job.title ?? ""), String(job.category ?? ""), String(job.work_type ?? "")],
        ).length;
        const evidenceCeiling = getSkillEvidenceCeiling(requiredSkills.length, rawMatchedSkills.length, roleOverlap, 0);
        matchScore = Math.round(clampScore(Math.min(matchScore, evidenceCeiling)));

        return {
          job_id: job.id,
          match_score: matchScore,
          matched_skills: rawMatchedSkills,
          skill_gaps: skillGaps,
          score_breakdown: {
            job_title_match: Math.round(titleMatchScore),
            skill_match: Math.round(skillAlignmentScore),
            description_similarity: Math.round(descriptionSimilarityScore),
          },
          reason: buildRecommendationReason(job, matchedSkills, skillGaps, descriptionSimilarityScore),
        };
      })
      .filter((item) => {
        if (profileSkills.length === 0) return item.match_score >= 45;
        return countSpecificSkills(item.matched_skills) > 0 || item.match_score >= 65;
      })
      .sort((left, right) => right.match_score - left.match_score);

    return jsonResponse({
      success: true,
      recommendations,
      model: applicantEmbedding ? "gemini-embedding-001" : "weighted-fallback",
      semantic_candidates: applicantEmbedding ? semanticCandidateJobs.length : 0,
      total_candidates: jobs.length,
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
