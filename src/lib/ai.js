import { supabase } from "./supabase";

function stripCssBlocks(value) {
  let cleaned = value;
  let previous = "";

  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned.replace(/[^{}]*\{[^{}]*\}/g, " ");
  }

  return cleaned;
}

function cleanJobText(value) {
  const source = String(value || "").trim();
  if (!source) return "";

  if (typeof DOMParser !== "undefined") {
    const parseText = (html) => {
      const document = new DOMParser().parseFromString(html, "text/html");
      document.querySelectorAll("script, style, noscript, svg").forEach((node) => node.remove());
      return String(document.body?.textContent || "");
    };
    const firstPass = parseText(source);
    const cleaned = /<\/?[a-z][\s\S]*>/i.test(firstPass) ? parseText(firstPass) : firstPass;

    return stripCssBlocks(cleaned)
      .replace(/\s+/g, " ")
      .trim();
  }

  return stripCssBlocks(source
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanJobRecord(job) {
  const description = cleanJobText(job?.description);
  const responsibilities = (job?.responsibilities ?? [])
    .map(cleanJobText)
    .filter((item) => item && !/^(?:work from home|remote|hybrid|on-?site)$/i.test(item));

  return {
    ...job,
    description,
    responsibilities,
  };
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }
}

async function loadOpenJobs(selectClause) {
  const { data, error } = await supabase
    .from("jobs")
    .select(selectClause)
    .eq("status", "Open")
    .eq("review_status", "Approved")
    .order("posted_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load jobs.");
  }

  return (data ?? []).map(cleanJobRecord);
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildLocalResumeFallback(payload) {
  const resumeText = String(payload?.resumeText ?? "");
  const lower = resumeText.toLowerCase();
  const knownSkills = [
    "embedded systems",
    "firmware",
    "robotics",
    "iot",
    "arduino",
    "raspberry pi",
    "microcontrollers",
    "electronics",
    "c++",
    "c",
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "sql",
    "git",
    "linux",
    "testing",
  ];

  const skills = [...new Set(knownSkills.filter((skill) => lower.includes(skill)).map((skill) => titleCase(skill)))].slice(0, 12);
  const suggestedRoles = skills.some((skill) => ["Embedded Systems", "Firmware", "Robotics", "Arduino", "Raspberry Pi"].includes(skill))
    ? ["Embedded Systems Intern", "Firmware Intern", "Computer Engineering Intern"]
    : ["Technical Intern", "Student Trainee"];

  return {
    success: true,
    parsedProfile: {
      headline: payload?.profile?.jobTitle || "Early-Career Technical Candidate",
      summary:
        "Your latest resume was uploaded, and a fallback summary was generated locally while the AI parser was unavailable. Review the extracted skills and role focus below.",
      skills,
      suggested_roles: suggestedRoles,
      experience_years: 0,
      education: [],
      certifications: [],
      projects: [],
      preferred_locations: [],
      strengths: skills.slice(0, 5),
      improvement_skills: ["Technical Communication", "Git Workflow", "Testing"].filter((item) => !skills.includes(item)),
      keywords: skills,
      sourceFileName: payload?.fileName || "resume",
      usedFallback: true,
      parserEngine: "local-fallback",
      parserError: "The live Gemini resume parser was unavailable, so local resume analysis was used instead.",
    },
  };
}

function normalizeTerms(values) {
  return values
    .flatMap((value) =>
      String(value || "")
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/),
    )
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

function dedupeSkills(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function clampScore(value, min = 8, max = 98) {
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

function isJuniorProfile(profile, resumeProfile) {
  const years = Number(resumeProfile?.experience_years ?? 0);
  if (Number.isFinite(years) && years > 0) return years < 3;

  const title = String(profile?.jobTitle ?? "").toLowerCase();
  const summary = String(resumeProfile?.summary ?? "").toLowerCase();
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

function getDomainPenalty(profile, resumeProfile, job, matchedSkills, requiredSkills) {
  const applicantDomains = detectRoleDomains([
    profile?.jobTitle,
    profile?.about,
    ...(profile?.skills ?? []),
    ...(resumeProfile?.suggested_roles ?? []),
    ...(resumeProfile?.summary ? [resumeProfile.summary] : []),
  ]);
  const listingDomains = detectRoleDomains([
    job?.title,
    job?.description,
    job?.category,
    ...requiredSkills,
    ...(job?.responsibilities ?? []),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 0;
  if (applicantDomains.some((domain) => listingDomains.includes(domain))) return 0;

  const specificMatchedCount = countSpecificSkills(matchedSkills);
  return specificMatchedCount === 0 ? 22 : 12;
}

function getDomainMatchBonus(profile, resumeProfile, job, requiredSkills) {
  const applicantDomains = detectRoleDomains([
    profile?.jobTitle,
    profile?.about,
    ...(profile?.skills ?? []),
    ...(resumeProfile?.suggested_roles ?? []),
    ...(resumeProfile?.summary ? [resumeProfile.summary] : []),
  ]);
  const listingDomains = detectRoleDomains([
    job?.title,
    job?.description,
    job?.category,
    ...requiredSkills,
    ...(job?.responsibilities ?? []),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 0;
  return applicantDomains.some((domain) => listingDomains.includes(domain)) ? 8 : 0;
}

function getDomainAlignmentScore(profile, resumeProfile, job, matchedSkills, requiredSkills) {
  const applicantDomains = detectRoleDomains([
    profile?.jobTitle,
    profile?.about,
    ...(profile?.skills ?? []),
    ...(resumeProfile?.suggested_roles ?? []),
    ...(resumeProfile?.summary ? [resumeProfile.summary] : []),
  ]);
  const listingDomains = detectRoleDomains([
    job?.title,
    job?.description,
    job?.category,
    ...requiredSkills,
    ...(job?.responsibilities ?? []),
  ]);

  if (applicantDomains.length === 0 || listingDomains.length === 0) return 60;
  if (applicantDomains.some((domain) => listingDomains.includes(domain))) return 100;
  return countSpecificSkills(matchedSkills) > 0 ? 35 : 10;
}

function getExperienceAlignmentScore(profile, resumeProfile, job) {
  const juniorProfile = isJuniorProfile(profile, resumeProfile);
  const seniorRole = isSeniorRole(job?.title, job?.description);

  if (juniorProfile && seniorRole) return 20;
  if (!juniorProfile && seniorRole) return 90;
  return 82;
}

function computeWeightedAverageScore(components) {
  const weightedTotal = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return totalWeight > 0 ? weightedTotal / totalWeight : 0;
}

function computeJobTitleMatchScore(profile, resumeProfile, job) {
  const targetRoles = [profile?.jobTitle, ...(resumeProfile?.suggested_roles ?? [])].filter(Boolean);
  const roleTerms = normalizeTerms(targetRoles);
  const titleTerms = normalizeTerms([job?.title]);

  if (roleTerms.length === 0) return 50;

  const overlap = roleTerms.filter((term) => titleTerms.includes(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(roleTerms.length, 1)) * 100 : 8;

  if (isJuniorProfile(profile, resumeProfile) && isSeniorRole(job?.title)) {
    score = Math.min(score, 22);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeDescriptionSimilarityScore(profile, resumeProfile, job, requiredSkills, matchedSkills) {
  const applicantTerms = normalizeTerms([
    profile?.about,
    resumeProfile?.summary,
    ...(resumeProfile?.strengths ?? []),
    ...(resumeProfile?.keywords ?? []),
    ...filterSpecificMatchedSkills(profile?.skills ?? []),
  ]);
  const descriptionTerms = new Set(
    normalizeTerms([job?.description, ...(job?.responsibilities ?? []), ...requiredSkills]),
  );

  if (applicantTerms.length === 0) return 45;

  const overlap = applicantTerms.filter((term) => descriptionTerms.has(term)).length;
  let score = overlap > 0 ? (overlap / Math.max(Math.min(applicantTerms.length, 12), 1)) * 100 : 10;

  if (getDomainAlignmentScore(profile, resumeProfile, job, matchedSkills, requiredSkills) < 40) {
    score = Math.min(score, countSpecificSkills(matchedSkills) > 0 ? 42 : 18);
  }

  return clampScore(Math.round(score), 0, 100);
}

function computeLocationMatchScore(profile, job) {
  const profileLocation = String(profile?.location || "").trim().toLowerCase();
  const listingText = `${job?.location || ""} ${job?.work_type || ""}`.toLowerCase();

  if (!profileLocation) return 55;
  if (listingText.includes(profileLocation)) return 100;
  if (listingText.includes("remote")) return 80;
  if (listingText.includes("hybrid")) return 65;
  return 20;
}

function filterSpecificMatchedSkills(skills) {
  return [...new Set((skills ?? []).filter((skill) => !isGenericSkill(skill)))];
}

const fallbackJobSkillDictionary = [
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

function inferJobSkills(job) {
  const existingSkills = Array.isArray(job.required_skills) ? job.required_skills.filter(Boolean) : [];
  if (existingSkills.length > 0) return existingSkills;

  const lowered = [
    job.title,
    job.company_name,
    job.location,
    job.work_type,
    job.description,
    ...(job.responsibilities ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const inferred = fallbackJobSkillDictionary
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

  return dedupeSkills(inferred);
}

function computeRecommendationFallback(payload, jobs) {
  const profile = payload?.profile ?? {};
  const resumeProfile = payload?.resumeProfile ?? {};
  const profileSkills = dedupeSkills([...(profile.skills ?? [])]);
  const roleTerms = normalizeTerms([profile.jobTitle, ...(resumeProfile.suggested_roles ?? [])]);
  const aboutTerms = normalizeTerms([profile.about, resumeProfile.summary]);
  const keywordTerms = normalizeTerms([...(resumeProfile.strengths ?? []), ...(resumeProfile.keywords ?? [])]);

  const recommendations = (jobs ?? [])
    .map((job) => {
      const requiredSkills = inferJobSkills(job);
      const rawMatchedSkills = getOverlapMatches(profileSkills, requiredSkills);
      const matchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);

      const jobTerms = new Set(
        normalizeTerms([
          job.title,
          job.company_name,
          job.location,
          job.work_type,
          job.description,
          ...requiredSkills,
          ...(job.responsibilities ?? []),
        ]),
      );

      const roleOverlap = roleTerms.filter((term) => jobTerms.has(term)).length;
      const summaryOverlap = aboutTerms.filter((term) => jobTerms.has(term)).length;
      const keywordOverlap = keywordTerms.filter((term) => jobTerms.has(term)).length;
      const specificMatchedCount = countSpecificSkills(matchedSkills);
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
      const titleMatchScore = computeJobTitleMatchScore(profile, resumeProfile, job);
      const descriptionSimilarityScore = computeDescriptionSimilarityScore(profile, resumeProfile, job, requiredSkills, rawMatchedSkills);
      const skillGaps = requiredSkills.filter((required) => !getOverlapMatches(rawMatchedSkills, [required]).length);
      let rawScore = Math.round(
        computeWeightedAverageScore([
          { score: titleMatchScore, weight: 0.35 },
          { score: skillAlignmentScore, weight: 0.4 },
          { score: descriptionSimilarityScore, weight: 0.25 },
        ]),
      );
      if (profileSkills.length > 0 && specificMatchedSkills.length === 0) {
        rawScore = Math.min(rawScore, genericMatchedSkills.length > 0 ? 52 : 38);
      }
      if (specificRequiredSkills.length > 0 && specificMatchedSkills.length === 0) {
        rawScore = Math.min(rawScore, 48);
      }
      if (getDomainAlignmentScore(profile, resumeProfile, job, rawMatchedSkills, requiredSkills) < 40) {
        rawScore = Math.min(rawScore, specificMatchedSkills.length > 0 ? 58 : 34);
      }
      if (getExperienceAlignmentScore(profile, resumeProfile, job) <= 20) {
        rawScore = Math.min(rawScore, 42);
      }
      const evidenceCeiling = getSkillEvidenceCeiling(requiredSkills.length, rawMatchedSkills.length, roleOverlap, summaryOverlap + keywordOverlap);
      const score = Math.round(clampScore(Math.min(rawScore, evidenceCeiling)));
      const reason =
        matchedSkills.length > 0
          ? `Fallback ranking kept this role high because your profile overlaps with ${matchedSkills.slice(0, 3).join(", ")} and the role direction still lines up with your current focus.`
          : `Fallback ranking kept this role visible because the role title and description still align with your current direction, even though the explicit skill overlap is limited.`;

      return {
        job,
        job_id: job.id,
        match_score: score,
        matched_skills: rawMatchedSkills,
        skill_gaps: skillGaps,
        score_breakdown: {
          job_title_match: Math.round(titleMatchScore),
          skill_match: Math.round(skillAlignmentScore),
          description_similarity: Math.round(descriptionSimilarityScore),
        },
        reason,
      };
    })
    .filter((item) => {
      if (profileSkills.length === 0) return item.match_score >= 45;
      return countSpecificSkills(item.matched_skills) > 0 || item.match_score >= 65;
    })
    .sort((left, right) => right.match_score - left.match_score);

  return {
    success: true,
    recommendations,
    usedFallback: true,
  };
}

export async function parseResumeProfile(payload) {
  ensureSupabase();

  const { data, error } = await supabase.functions.invoke("parse-resume-profile", {
    body: payload,
  });

  if (error) {
    return buildLocalResumeFallback(payload);
  }

  if (data?.error) {
    return buildLocalResumeFallback(payload);
  }

  return data;
}

export async function fetchRecommendedJobs(payload) {
  ensureSupabase();

  const { data, error } = await supabase.functions.invoke("recommend-jobs", {
    body: payload,
  });

  if (error) {
    let detailedError = "The recommend-jobs function could not be reached.";

    if (error.context instanceof Response) {
      try {
        const responseBody = await error.context.text();
        if (responseBody) {
          try {
            const parsed = JSON.parse(responseBody);
            detailedError =
              parsed?.error ||
              parsed?.message ||
              parsed?.code ||
              responseBody;
          } catch {
            detailedError = responseBody;
          }
        } else {
          detailedError = `${error.message || "Edge Function request failed."} (status ${error.context.status})`;
        }
      } catch {
        detailedError = `${error.message || "Edge Function request failed."} (status ${error.context.status})`;
      }
    } else if (error.context && typeof error.context === "object") {
      detailedError =
        error.context.error ||
        error.context.msg ||
        error.context.message ||
        error.message ||
        detailedError;
    } else if (error.message) {
      detailedError = error.message;
    }

    const jobs = await loadOpenJobs(
      "id, title, company_name, category, location, work_type, description, responsibilities, required_skills, posted_at, source_platform, source_url",
    );
    return {
      ...computeRecommendationFallback(payload, jobs ?? []),
      fallbackError: detailedError,
      fallbackSource: "edge-function-request",
    };
  }

  if (data?.error) {
    const jobs = await loadOpenJobs(
      "id, title, company_name, category, location, work_type, description, responsibilities, required_skills, posted_at, source_platform, source_url",
    );
    return {
      ...computeRecommendationFallback(payload, jobs ?? []),
      fallbackError: data.error || "The recommend-jobs function returned an error.",
      fallbackSource: "edge-function-response",
    };
  }

  return data;
}

function buildRoadmapPhase(id, label, range, title, skills, actions, nodeClass, status = "", statusClass = "") {
  return {
    id,
    label,
    range,
    title,
    skills: dedupeSkills(skills).slice(0, 6),
    actions: dedupeSkills(actions).slice(0, 4),
    nodeClass,
    status,
    statusClass,
  };
}

const ROADMAP_REQUEST_TIMEOUT_MS = 15000;

export function buildCareerRoadmapFallback(payload) {
  const profile = payload?.profile ?? {};
  const resumeProfile = payload?.resumeProfile ?? {};
  const profileSkills = dedupeSkills([...(profile.skills ?? []), ...(resumeProfile.skills ?? [])]);
  const roleFocus = profile.jobTitle || resumeProfile.suggested_roles?.[0] || "your current target role";
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];

  const roadmaps = jobs.slice(0, 3).map((job) => {
    const requiredSkills = dedupeSkills(job.requiredSkills ?? job.required_skills ?? inferJobSkills(job)).slice(0, 8);
    const matchedSkills = dedupeSkills(job.matchedSkills ?? job.matched_skills ?? getOverlapMatches(profileSkills, requiredSkills));
    const skillGaps = dedupeSkills(job.gaps ?? job.skill_gaps ?? requiredSkills.filter((skill) => !matchedSkills.some((matched) => skillsMatch(matched, skill))));
    const strengths = filterSpecificMatchedSkills(matchedSkills).slice(0, 4);
    const focusSkills = dedupeSkills([...skillGaps, ...requiredSkills]).slice(0, 6);
    const jobTitle = job.title || "Applied role";
    const companyName = job.company || job.company_name || "Employer";
    const fitSummary =
      strengths.length > 0
        ? `${jobTitle} already overlaps with your profile through ${strengths.slice(0, 3).join(", ")}. The roadmap focuses on closing the remaining gaps for this application without losing sight of ${roleFocus}.`
        : `${jobTitle} is directionally aligned with ${roleFocus}, but it needs stronger role-specific proof. This roadmap prioritizes the clearest missing capabilities from the listing first.`;

    return {
      job_id: job.id,
      title: jobTitle,
      company_name: companyName,
      target_role: roleFocus,
      _source: "local-fallback",
      fit_summary: fitSummary,
      estimated_timeline: skillGaps.length > 3 ? "10-14 weeks" : "6-10 weeks",
      focus_skills: focusSkills,
      phases: [
        buildRoadmapPhase(
          "now",
          "Now",
          "Current strengths",
          `Anchor what already fits ${jobTitle}`,
          strengths.length ? strengths : profileSkills.slice(0, 4),
          [
            "Keep your strongest matching projects easy to explain in interviews",
            "Update your resume bullets so they mirror this job's wording",
            "Gather one concrete proof point for each matching skill",
          ],
          strengths.length ? "done" : "active",
          strengths.length ? "Complete" : "Active",
          strengths.length ? "completed" : "in-progress",
        ),
        buildRoadmapPhase(
          "phase-1",
          "Phase 1",
          "Weeks 1-3",
          `Close the biggest gaps for ${jobTitle}`,
          skillGaps.slice(0, 3),
          skillGaps.slice(0, 3).map((skill) => `Practice ${skill} through a focused mini-project or guided lab`),
          "active",
          "Active",
          "in-progress",
        ),
        buildRoadmapPhase(
          "phase-2",
          "Phase 2",
          "Weeks 4-7",
          `Build job-specific proof for ${companyName}`,
          dedupeSkills([...focusSkills.slice(0, 2), "Portfolio Storytelling", "Interview Examples"]),
          [
            `Create one portfolio artifact that looks relevant to ${jobTitle}`,
            "Write STAR stories around your most relevant coursework or projects",
            "Practice explaining tradeoffs, tools, and results out loud",
          ],
          "future",
        ),
        buildRoadmapPhase(
          "target",
          "Target",
          "Weeks 8+",
          `Become a stronger repeatable match for similar ${jobTitle} roles`,
          dedupeSkills([...requiredSkills.slice(0, 3), "Professional Positioning"]),
          [
            "Refresh your profile with the strongest new evidence",
            "Apply the same proof strategy to similar openings",
            "Keep iterating on the skills most often requested in your target roles",
          ],
          "future",
        ),
      ],
    };
  });

  return {
    success: true,
    roadmaps,
    usedFallback: true,
    roadmapEngine: "local-fallback",
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchCareerRoadmaps(payload) {
  ensureSupabase();

  let data;
  let error;

  try {
    ({ data, error } = await Promise.race([
      supabase.functions.invoke("generate-career-roadmaps", {
        body: payload,
      }),
      new Promise((_, reject) => {
        window.setTimeout(() => {
          reject(new Error("Roadmap generation timed out after 15 seconds."));
        }, ROADMAP_REQUEST_TIMEOUT_MS);
      }),
    ]));
  } catch (requestError) {
    const detailedError = requestError instanceof Error ? requestError.message : "The generate-career-roadmaps function could not be reached.";
    return {
      ...buildCareerRoadmapFallback(payload),
      fallbackError: detailedError,
      fallbackSource: "edge-function-timeout",
    };
  }

  if (error) {
    let detailedError = "The generate-career-roadmaps function could not be reached.";

    if (error.context instanceof Response) {
      try {
        const responseBody = await error.context.text();
        if (responseBody) {
          try {
            const parsed = JSON.parse(responseBody);
            detailedError =
              parsed?.error ||
              parsed?.message ||
              parsed?.code ||
              responseBody;
          } catch {
            detailedError = responseBody;
          }
        } else {
          detailedError = `${error.message || "Edge Function request failed."} (status ${error.context.status})`;
        }
      } catch {
        detailedError = `${error.message || "Edge Function request failed."} (status ${error.context.status})`;
      }
    } else if (error.context && typeof error.context === "object") {
      detailedError =
        error.context.error ||
        error.context.msg ||
        error.context.message ||
        error.message ||
        detailedError;
    } else if (error.message) {
      detailedError = error.message;
    }

    return {
      ...buildCareerRoadmapFallback(payload),
      fallbackError: detailedError,
      fallbackSource: "edge-function-request",
    };
  }

  if (data?.error) {
    return {
      ...buildCareerRoadmapFallback(payload),
      fallbackError: data.error || "The generate-career-roadmaps function returned an error.",
      fallbackSource: "edge-function-response",
    };
  }

  if (!Array.isArray(data?.roadmaps) || data.roadmaps.length === 0) {
    return {
      ...buildCareerRoadmapFallback(payload),
      fallbackError: "No roadmap content was returned for the current applied jobs.",
      fallbackSource: "empty-roadmap-response",
    };
  }

  return data;
}

export async function fetchLiveJobs() {
  ensureSupabase();

  return loadOpenJobs("*");
}
