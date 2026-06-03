import { supabase } from "./supabase";

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }
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
      const roleAlignmentScore = clampScore(Math.round(Math.min(roleOverlap * 26, 100)), 0, 100);
      const domainAlignmentScore = getDomainAlignmentScore(profile, resumeProfile, job, rawMatchedSkills, requiredSkills);
      const experienceAlignmentScore = getExperienceAlignmentScore(profile, resumeProfile, job);
      const contextAlignmentScore = clampScore(Math.round(Math.min(summaryOverlap * 18 + keywordOverlap * 10, 100)), 0, 100);
      const skillGaps = requiredSkills.filter((required) => !getOverlapMatches(rawMatchedSkills, [required]).length).slice(0, 4);
      let rawScore = Math.round(
        computeWeightedAverageScore([
          { score: skillAlignmentScore, weight: 0.5 },
          { score: roleAlignmentScore, weight: 0.2 },
          { score: domainAlignmentScore, weight: 0.15 },
          { score: experienceAlignmentScore, weight: 0.1 },
          { score: contextAlignmentScore, weight: 0.05 },
        ]),
      );
      if (profileSkills.length > 0 && specificMatchedSkills.length === 0) {
        rawScore = Math.min(rawScore, genericMatchedSkills.length > 0 ? 52 : 38);
      }
      if (specificRequiredSkills.length > 0 && specificMatchedSkills.length === 0) {
        rawScore = Math.min(rawScore, 48);
      }
      if (domainAlignmentScore < 40) {
        rawScore = Math.min(rawScore, specificMatchedSkills.length > 0 ? 58 : 34);
      }
      if (experienceAlignmentScore <= 20) {
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
        matched_skills: matchedSkills,
        skill_gaps: skillGaps,
        score_breakdown: {
          skill_alignment: Math.round(skillAlignmentScore),
          role_alignment: Math.round(roleAlignmentScore),
          context_alignment: Math.round(contextAlignmentScore),
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
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, company_name, category, location, work_type, description, responsibilities, required_skills, posted_at, source_platform, source_url")
      .eq("status", "Open")
      .eq("review_status", "Approved")
      .order("posted_at", { ascending: false });

    if (jobsError) {
      throw new Error(error.message || jobsError.message || "Job recommendation failed.");
    }

    return computeRecommendationFallback(payload, jobs ?? []);
  }

  if (data?.error) {
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, company_name, category, location, work_type, description, responsibilities, required_skills, posted_at, source_platform, source_url")
      .eq("status", "Open")
      .eq("review_status", "Approved")
      .order("posted_at", { ascending: false });

    if (jobsError) {
      throw new Error(data.error);
    }

    return computeRecommendationFallback(payload, jobs ?? []);
  }

  return data;
}

export async function fetchLiveJobs() {
  ensureSupabase();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "Open")
    .eq("review_status", "Approved")
    .order("posted_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load jobs.");
  }

  return data ?? [];
}
