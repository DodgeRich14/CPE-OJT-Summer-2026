import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function overlapCount(a: string[], b: string[]) {
  const left = a.map((item) => item.toLowerCase());
  const right = b.map((item) => item.toLowerCase());
  return right.filter((skill) => left.some((current) => current.includes(skill) || skill.includes(current))).length;
}

function getOverlapMatches(sourceSkills: string[], targetSkills: string[]) {
  const left = sourceSkills.map((item) => item.toLowerCase());
  return targetSkills.filter((skill) => left.some((current) => current.includes(skill.toLowerCase()) || skill.toLowerCase().includes(current)));
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

    let query = supabase
      .from("jobs")
      .select("id, title, company_name, category, location, work_type, description, responsibilities, required_skills, posted_at, source_platform, source_url")
      .eq("status", "Open")
      .eq("review_status", "Approved")
      .order("posted_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const shortlist = (jobs ?? [])
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
      .filter((job) => {
        if (technicalFocus) {
          if (job.nonTechnicalSignal && job.baseOverlap === 0) return false;
          if (!detectRoleDomains([
            String(profile.jobTitle ?? ""),
            String(profile.about ?? ""),
            ...profileSkills,
            ...((resumeProfile.suggested_roles ?? []) as string[]),
            String(resumeProfile.summary ?? ""),
          ]).some((domain) => detectRoleDomains([
            String(job.title ?? ""),
            String(job.description ?? ""),
            String(job.category ?? ""),
            ...((job.required_skills ?? []) as string[]),
          ]).includes(domain)) && job.baseOverlap <= 1) {
            return false;
          }
          if (job.baseOverlap > 0) return true;
          return job.technicalSignal && job.roleOverlap >= 1;
        }

        if (profileSkills.length > 0) {
          if (juniorProfile && isSeniorRole(String(job.title ?? ""), String(job.description ?? "")) && job.baseOverlap <= 1) {
            return false;
          }
          return job.baseOverlap > 0 || job.roleOverlap >= 1;
        }

        return true;
      })
      .filter((job) => job.heuristicScore > 0)
      .sort((left, right) => right.heuristicScore - left.heuristicScore)
      .slice(0, 20);

    const refinedShortlist = shortlist
      .sort((left, right) => right.heuristicScore - left.heuristicScore)
      .slice(0, 16);

    if (refinedShortlist.length === 0) {
      return jsonResponse({ success: true, recommendations: [] });
    }

    const prompt = `
You are the final LLM judge for a student and fresh-graduate jobs platform.

Applicant profile:
${JSON.stringify(
      {
        full_name: profile.fullName,
        job_title: profile.jobTitle,
        location: profile.location,
        skills: profileSkills,
        about: profile.about,
        resume_summary: resumeProfile.summary,
        suggested_roles: resumeProfile.suggested_roles ?? [],
        strengths: resumeProfile.strengths ?? [],
        improvement_skills: resumeProfile.improvement_skills ?? [],
      },
      null,
      2,
    )}

Candidate jobs:
${JSON.stringify(refinedShortlist, null, 2)}

Return valid JSON only with this exact shape:
{
  "recommendations": [
    {
      "job_id": "uuid",
      "is_recommended": true,
      "match_score": 0,
      "score_breakdown": {
        "skill_alignment": 0,
        "role_alignment": 0,
        "growth_alignment": 0,
        "context_alignment": 0
      },
      "matched_skills": ["skill"],
      "skill_gaps": ["gap"],
      "reason": "one short paragraph"
    }
  ]
}

Rules:
- Only include jobs that are genuinely aligned to the applicant's technical background, skills, and likely career path.
- Exclude obviously mismatched HR, admin, clerical, recruitment, accounting, sales, and marketing roles for technical applicants unless the applicant profile explicitly points there.
- If a role is not a fit, do not include it in recommendations at all.
- Keep match_score between 60 and 98.
- Do not give a role an extremely high score when direct skill evidence is thin. If only one skill clearly matches, the score should usually stay moderate rather than landing in the 90s.
- Favor entry-level, internship, and student-appropriate roles when the profile looks junior.
- Use only the provided candidate jobs.
- matched_skills and skill_gaps must be concrete.
- reason should explain why the job is a fit in plain language.
- Judge each role with this rubric:
  - skill_alignment: 0-45 based on direct skill overlap and adjacent technical fit
  - role_alignment: 0-25 based on title, responsibilities, and career direction
  - growth_alignment: 0-15 based on whether this is an achievable next step for the applicant
  - context_alignment: 0-15 based on summary, interests, and practical context
- match_score should reflect the total judgment, not a random estimate.
`;

    const aiResult = await callGemini(prompt);
    const recommendationMap = new Map(
      (aiResult.recommendations ?? [])
        .filter((item: Record<string, unknown>) => Boolean(item.is_recommended))
        .map((item: Record<string, unknown>) => [String(item.job_id), item]),
    );

    const recommendations = refinedShortlist
      .filter((job) => recommendationMap.has(job.id))
      .map((job) => {
        const item = recommendationMap.get(job.id) as Record<string, unknown>;
        const aiMatchedSkills = dedupe((item.matched_skills as string[] | undefined) ?? []);
        const rawMatchedSkills = dedupe(getOverlapMatches(profileSkills, aiMatchedSkills)).filter((skill) =>
          getOverlapMatches([skill], (job.required_skills ?? []) as string[]).length > 0,
        );
        const matchedSkills = filterSpecificMatchedSkills(rawMatchedSkills);
        const skillGaps = dedupe((item.skill_gaps as string[] | undefined) ?? []).filter(
          (skill) => !rawMatchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase()),
        );
        const contextOverlapCount = overlapCount(
          dedupe([
            String(profile.about ?? ""),
            String(resumeProfile.summary ?? ""),
            ...((resumeProfile.strengths ?? []) as string[]),
            ...((resumeProfile.keywords ?? []) as string[]),
          ]),
          [String(job.title ?? ""), String(job.description ?? ""), ...((job.required_skills ?? []) as string[])],
        );
        const evidenceCeiling = getSkillEvidenceCeiling(
          ((job.required_skills ?? []) as string[]).length,
          rawMatchedSkills.length,
          job.roleOverlap ?? 0,
          contextOverlapCount,
        );
        const specificMatchedCount = countSpecificSkills(matchedSkills);
        const seniorityPenalty = juniorProfile && isSeniorRole(String(job.title ?? ""), String(job.description ?? "")) ? 18 : 0;
        const genericOnlyPenalty = rawMatchedSkills.length > 0 && specificMatchedCount === 0 ? 18 : 0;
        const domainPenalty = getDomainPenalty(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
          rawMatchedSkills,
          (job.required_skills ?? []) as string[],
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
        const roleAlignmentScore = clampScore(Math.round(Math.min((job.roleOverlap ?? 0) * 26, 100)), 0, 100);
        const domainAlignmentScore = getDomainAlignmentScore(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
          rawMatchedSkills,
          (job.required_skills ?? []) as string[],
        );
        const experienceAlignmentScore = getExperienceAlignmentScore(
          profile as Record<string, unknown>,
          resumeProfile as Record<string, unknown>,
          job as Record<string, unknown>,
        );
        const contextAlignmentScore = clampScore(Math.round(Math.min(contextOverlapCount * 20, 100)), 0, 100);
        let deterministicScore = Math.round(
          computeWeightedAverageScore([
            { score: skillAlignmentScore, weight: 0.5 },
            { score: roleAlignmentScore, weight: 0.2 },
            { score: domainAlignmentScore, weight: 0.15 },
            { score: experienceAlignmentScore, weight: 0.1 },
            { score: contextAlignmentScore, weight: 0.05 },
          ]),
        );
        if (profileSkills.length > 0 && specificMatchedSkills.length === 0) {
          deterministicScore = Math.min(deterministicScore, genericMatchedSkills.length > 0 ? 52 : 38);
        }
        if (specificRequiredSkills.length > 0 && specificMatchedSkills.length === 0) {
          deterministicScore = Math.min(deterministicScore, 48);
        }
        if (domainAlignmentScore < 40) {
          deterministicScore = Math.min(deterministicScore, specificMatchedSkills.length > 0 ? 58 : 34);
        }
        if (experienceAlignmentScore <= 20) {
          deterministicScore = Math.min(deterministicScore, 42);
        }
        deterministicScore = clampScore(Math.min(deterministicScore, evidenceCeiling), 0, 100);

        return {
          job,
          job_id: job.id,
          match_score: deterministicScore,
          score_breakdown: {
            skill_alignment: Math.round(skillAlignmentScore),
            role_alignment: Math.round(roleAlignmentScore),
            growth_alignment: Math.round(experienceAlignmentScore),
            context_alignment: Math.round(contextAlignmentScore),
          },
          matched_skills: matchedSkills,
          skill_gaps: skillGaps,
          reason: String(item.reason ?? ""),
        };
      })
      .filter((item) => {
        if (profileSkills.length === 0) {
          return item.match_score >= 60 && Boolean(item.reason);
        }

        return item.match_score >= 60 && countSpecificSkills(item.matched_skills) > 0;
      })
      .sort((left, right) => right.match_score - left.match_score);

    return jsonResponse({
      success: true,
      recommendations,
      model: "gemini-2.5-flash",
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
