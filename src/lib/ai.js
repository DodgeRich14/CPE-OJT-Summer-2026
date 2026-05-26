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
    throw new Error(error.message || "Job recommendation failed.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function fetchLiveJobs(limit = 18) {
  ensureSupabase();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "Open")
    .eq("review_status", "Approved")
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Failed to load jobs.");
  }

  return data ?? [];
}
