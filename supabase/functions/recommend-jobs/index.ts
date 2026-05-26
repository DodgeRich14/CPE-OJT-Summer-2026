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

function overlapCount(a: string[], b: string[]) {
  const left = a.map((item) => item.toLowerCase());
  const right = b.map((item) => item.toLowerCase());
  return right.filter((skill) => left.some((current) => current.includes(skill) || skill.includes(current))).length;
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

function detectTechnicalFocus(profileSkills: string[], profileText: string) {
  const combined = `${profileSkills.join(" ")} ${profileText}`.toLowerCase();
  return includesAny(combined, technicalKeywords);
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
    const profileSkills = dedupe([...(profile.skills ?? []), ...(resumeProfile.skills ?? [])]);
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
      .order("posted_at", { ascending: false })
      .limit(16);

    if (category) {
      query = query.eq("category", category);
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const shortlist = (jobs ?? [])
      .map((job) => {
        const jobText = buildJobSearchText(job as Record<string, unknown>);
        const baseOverlap = overlapCount(profileSkills, job.required_skills ?? []);
        const technicalSignal = includesAny(jobText, technicalKeywords);
        const nonTechnicalSignal = isClearlyNonTechnical(jobText);

        return {
          ...job,
          baseOverlap,
          technicalSignal,
          nonTechnicalSignal,
          heuristicScore:
            baseOverlap * 20 +
            (technicalSignal ? 14 : 0) -
            (nonTechnicalSignal ? 30 : 0),
        };
      })
      .filter((job) => {
        if (!technicalFocus) return true;
        if (job.nonTechnicalSignal && job.baseOverlap === 0) return false;
        if (job.baseOverlap > 0) return true;
        return job.technicalSignal;
      })
      .filter((job) => job.heuristicScore > 0)
      .sort((left, right) => right.heuristicScore - left.heuristicScore)
      .slice(0, 12);

    const refinedShortlist = shortlist
      .sort((left, right) => right.baseOverlap - left.baseOverlap)
      .slice(0, 10);

    if (refinedShortlist.length === 0) {
      return jsonResponse({ success: true, recommendations: [] });
    }

    const prompt = `
You are the recommendation engine for a student and fresh-graduate jobs platform.

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
- Favor entry-level, internship, and student-appropriate roles when the profile looks junior.
- Use only the provided candidate jobs.
- matched_skills and skill_gaps must be concrete.
- reason should explain why the job is a fit in plain language.
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
        return {
          job,
          job_id: job.id,
          match_score: Number(item.match_score ?? 0),
          matched_skills: dedupe((item.matched_skills as string[] | undefined) ?? []),
          skill_gaps: dedupe((item.skill_gaps as string[] | undefined) ?? []),
          reason: String(item.reason ?? ""),
        };
      })
      .filter((item) => item.match_score >= 60 && (item.matched_skills.length > 0 || item.reason))
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
