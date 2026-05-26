/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const skillKeywords = [
  "embedded systems",
  "firmware",
  "robotics",
  "iot",
  "microcontroller",
  "arduino",
  "raspberry pi",
  "pcb design",
  "circuit design",
  "control systems",
  "c++",
  "c",
  "python",
  "java",
  "javascript",
  "typescript",
  "react",
  "node.js",
  "node",
  "sql",
  "mysql",
  "postgresql",
  "html",
  "css",
  "git",
  "linux",
  "matlab",
  "autocad",
  "verilog",
  "vhdl",
  "machine learning",
  "computer vision",
  "api",
  "testing",
  "debugging",
  "electronics",
  "automation",
];

const roleHints = [
  "embedded systems intern",
  "firmware intern",
  "software engineering intern",
  "qa intern",
  "iot intern",
  "robotics intern",
  "frontend intern",
  "backend intern",
  "technical support intern",
  "computer engineering intern",
];

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

function cleanResumeText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function inferSkills(text: string) {
  const lower = text.toLowerCase();
  return dedupe(
    skillKeywords
      .filter((keyword) => lower.includes(keyword))
      .map((keyword) => titleCase(keyword)),
  ).slice(0, 16);
}

function inferRoles(text: string, skills: string[]) {
  const lower = text.toLowerCase();
  const roles = roleHints.filter((role) => {
    if (lower.includes(role)) return true;
    return skills.some((skill) => role.includes(skill.toLowerCase()) || skill.toLowerCase().includes(role.split(" ")[0]));
  });

  if (roles.length > 0) {
    return dedupe(roles.map((role) => titleCase(role))).slice(0, 5);
  }

  if (skills.some((skill) => ["Embedded Systems", "Firmware", "Robotics", "Arduino", "Raspberry Pi"].includes(skill))) {
    return ["Embedded Systems Intern", "Firmware Intern", "Computer Engineering Intern"];
  }

  if (skills.some((skill) => ["React", "Javascript", "Typescript", "Node.js", "Sql"].includes(skill))) {
    return ["Software Engineering Intern", "Frontend Intern", "Full-Stack Intern"];
  }

  return ["Technical Intern", "Student Trainee"];
}

function inferEducation(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const matches = lines.filter((line) => {
    const lower = line.toLowerCase();
    return lower.includes("bachelor") || lower.includes("bs ") || lower.includes("computer engineering") || lower.includes("engineering");
  });

  return dedupe(matches).slice(0, 3);
}

function inferProjects(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter((line) => {
      const lower = line.toLowerCase();
      return lower.includes("project") || lower.includes("capstone") || lower.includes("thesis") || lower.includes("developed");
    })
    .slice(0, 4);
}

function inferHeadline(skills: string[], existingProfile: Record<string, unknown>) {
  const currentTitle = String(existingProfile.jobTitle ?? "").trim();
  if (currentTitle) return currentTitle;

  if (skills.includes("Embedded Systems") || skills.includes("Firmware") || skills.includes("Robotics")) {
    return "Embedded Systems and Robotics Candidate";
  }

  if (skills.includes("React") || skills.includes("Javascript") || skills.includes("Typescript")) {
    return "Software Development Candidate";
  }

  return "Early-Career Technical Candidate";
}

function inferSummary(skills: string[], education: string[], projects: string[]) {
  const primarySkills = skills.slice(0, 4).join(", ");
  const educationLine = education[0] ? `The resume highlights ${education[0]}.` : "The resume shows a technical learning path for early-career roles.";
  const projectsLine = projects[0]
    ? `Recent work includes ${projects[0].replace(/\.$/, "")}.`
    : "The profile is best suited for internships and entry-level technical opportunities.";

  return `${educationLine} Strongest signals include ${primarySkills || "technical fundamentals"}. ${projectsLine}`;
}

function inferImprovementSkills(skills: string[]) {
  const suggested = [];

  if (!skills.some((skill) => skill.includes("Testing"))) suggested.push("Testing");
  if (!skills.some((skill) => skill.includes("Git"))) suggested.push("Git Workflow");
  if (!skills.some((skill) => skill.includes("Communication"))) suggested.push("Technical Communication");
  if (!skills.some((skill) => skill.includes("Sql"))) suggested.push("SQL");

  return suggested.slice(0, 4);
}

function buildFallbackProfile(resumeText: string, fileName: string, existingProfile: Record<string, unknown>) {
  const skills = inferSkills(resumeText);
  const education = inferEducation(resumeText);
  const projects = inferProjects(resumeText);

  return {
    headline: inferHeadline(skills, existingProfile),
    summary: inferSummary(skills, education, projects),
    skills,
    suggested_roles: inferRoles(resumeText, skills),
    experience_years: 0,
    education,
    certifications: [],
    projects,
    preferred_locations: [],
    strengths: skills.slice(0, 5),
    improvement_skills: inferImprovementSkills(skills),
    keywords: skills,
    sourceFileName: fileName,
    usedFallback: true,
  };
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
    const rawResumeText = String(body.resumeText ?? "");
    const resumeText = cleanResumeText(rawResumeText);
    const fileName = String(body.fileName ?? "resume");
    const existingProfile = body.profile ?? {};

    if (!resumeText) {
      return jsonResponse({ error: "Resume text is required." }, 400);
    }

    const trimmedResumeText = resumeText.slice(0, 12000);
    const fallbackProfile = buildFallbackProfile(trimmedResumeText, fileName, existingProfile);

    const prompt = `
You are helping a student and early-career jobs platform build a structured applicant profile from a resume.

Resume file name: ${fileName}
Existing profile context:
${JSON.stringify(existingProfile, null, 2)}

Resume text:
"""
${trimmedResumeText}
"""

Return valid JSON only with this exact shape:
{
  "headline": "short role headline",
  "summary": "2-3 sentence profile summary",
  "skills": ["skill"],
  "suggested_roles": ["role"],
  "experience_years": 0,
  "education": ["education item"],
  "certifications": ["certification"],
  "projects": ["project summary"],
  "preferred_locations": ["location"],
  "strengths": ["strength"],
  "improvement_skills": ["skill gap"],
  "keywords": ["keyword"]
}

Rules:
- The newly uploaded resume is the source of truth. If it conflicts with older profile context, prefer the resume.
- Use existing profile context only as a light fallback for missing contact or preference details, not for summary, role focus, or skills.
- Keep skills concise and employer-facing.
- Prefer concrete technologies and tools.
- If the applicant is a student or fresh graduate, estimate experience conservatively.
- Do not invent companies or credentials that are not supported by the resume text.
- Always return a fresh summary based on this resume upload, even if the applicant uploaded a previous resume before.
`;

    try {
      const parsed = await callGemini(prompt);

      return jsonResponse({
        success: true,
        parsedProfile: {
          ...fallbackProfile,
          ...parsed,
          skills: dedupe(Array.isArray(parsed.skills) ? parsed.skills : fallbackProfile.skills),
          suggested_roles: dedupe(
            Array.isArray(parsed.suggested_roles) ? parsed.suggested_roles : fallbackProfile.suggested_roles,
          ),
          education: dedupe(Array.isArray(parsed.education) ? parsed.education : fallbackProfile.education),
          certifications: dedupe(Array.isArray(parsed.certifications) ? parsed.certifications : []),
          projects: dedupe(Array.isArray(parsed.projects) ? parsed.projects : fallbackProfile.projects),
          preferred_locations: dedupe(
            Array.isArray(parsed.preferred_locations) ? parsed.preferred_locations : fallbackProfile.preferred_locations,
          ),
          strengths: dedupe(Array.isArray(parsed.strengths) ? parsed.strengths : fallbackProfile.strengths),
          improvement_skills: dedupe(
            Array.isArray(parsed.improvement_skills) ? parsed.improvement_skills : fallbackProfile.improvement_skills,
          ),
          keywords: dedupe(Array.isArray(parsed.keywords) ? parsed.keywords : fallbackProfile.keywords),
          summary: String(parsed.summary ?? fallbackProfile.summary),
          headline: String(parsed.headline ?? fallbackProfile.headline),
          sourceFileName: fileName,
          usedFallback: false,
        },
      });
    } catch (_error) {
      return jsonResponse({
        success: true,
        parsedProfile: fallbackProfile,
      });
    }
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Resume parsing failed.",
      },
      500,
    );
  }
});
