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
  const profileSkills = dedupeSkills([...(profile.skills ?? []), ...(resumeProfile.skills ?? [])]);
  const roleTerms = normalizeTerms([profile.jobTitle, ...(resumeProfile.suggested_roles ?? [])]);
  const aboutTerms = normalizeTerms([profile.about, resumeProfile.summary]);

  const recommendations = (jobs ?? [])
    .map((job) => {
      const requiredSkills = inferJobSkills(job);
      const matchedSkills = requiredSkills.filter((required) =>
        profileSkills.some((skill) => {
          const currentSkill = skill.toLowerCase();
          const neededSkill = required.toLowerCase();
          return currentSkill.includes(neededSkill) || neededSkill.includes(currentSkill);
        }),
      );

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
      const skillScore = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 82 : matchedSkills.length * 12;
      const score = Math.round(Math.max(Math.min(skillScore + roleOverlap * 6 + Math.min(summaryOverlap, 2) * 4, 97), 8));
      const skillGaps = requiredSkills.filter((required) => !matchedSkills.includes(required)).slice(0, 4);
      const reason =
        matchedSkills.length > 0
          ? `Fallback ranking matched this role because your profile overlaps with ${matchedSkills.slice(0, 3).join(", ")}.`
          : `Fallback ranking kept this role visible based on your current role direction and related keywords from your profile.`;

      return {
        job,
        job_id: job.id,
        match_score: score,
        matched_skills: matchedSkills,
        skill_gaps: skillGaps,
        reason,
      };
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
