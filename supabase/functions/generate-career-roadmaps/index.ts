/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const roadmapResponseSchema = {
  type: "OBJECT",
  properties: {
    roadmaps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          job_id: { type: "STRING" },
          title: { type: "STRING" },
          company_name: { type: "STRING" },
          target_role: { type: "STRING" },
          fit_summary: { type: "STRING" },
          estimated_timeline: { type: "STRING" },
          focus_skills: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          phases: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                title: { type: "STRING" },
                skills: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                actions: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
              },
              required: ["id", "title", "skills", "actions"],
            },
          },
        },
        required: ["job_id", "title", "company_name", "target_role", "fit_summary", "estimated_timeline", "focus_skills", "phases"],
      },
    },
  },
  required: ["roadmaps"],
};

const phaseBlueprint = [
  { id: "now", label: "Now", range: "Current strengths", nodeClass: "done", status: "Complete", statusClass: "completed" },
  { id: "phase-1", label: "Phase 1", range: "Weeks 1-3", nodeClass: "active", status: "Active", statusClass: "in-progress" },
  { id: "phase-2", label: "Phase 2", range: "Weeks 4-7", nodeClass: "future", status: "", statusClass: "" },
  { id: "target", label: "Target", range: "Weeks 8+", nodeClass: "future", status: "", statusClass: "" },
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

function dedupe(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function buildPhase(index: number, phase: Record<string, unknown> = {}) {
  const template = phaseBlueprint[index] ?? phaseBlueprint[phaseBlueprint.length - 1];
  return {
    ...template,
    title: String(phase.title || "").trim() || template.label,
    skills: dedupe(Array.isArray(phase.skills) ? phase.skills : []).slice(0, 6),
    actions: dedupe(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 4),
  };
}

function buildFallbackRoadmaps(profile: Record<string, unknown>, resumeProfile: Record<string, unknown>, jobs: Array<Record<string, unknown>>) {
  const profileSkills = dedupe([...(Array.isArray(profile.skills) ? profile.skills : []), ...(Array.isArray(resumeProfile.skills) ? resumeProfile.skills : [])]);
  const roleFocus = String(profile.jobTitle || (Array.isArray(resumeProfile.suggested_roles) ? resumeProfile.suggested_roles[0] : "") || "your target role").trim();

  return jobs.slice(0, 3).map((job) => {
    const requiredSkills = dedupe(Array.isArray(job.requiredSkills) ? job.requiredSkills : []).slice(0, 8);
    const matchedSkills = dedupe(Array.isArray(job.matchedSkills) ? job.matchedSkills : []).slice(0, 4);
    const gaps = dedupe(Array.isArray(job.gaps) ? job.gaps : []).slice(0, 4);

    return {
      job_id: String(job.id || ""),
      title: String(job.title || "Applied role"),
      company_name: String(job.company_name || "Employer"),
      target_role: roleFocus,
      fit_summary:
        matchedSkills.length > 0
          ? `This role already overlaps with your profile through ${matchedSkills.slice(0, 3).join(", ")}. The roadmap focuses on closing the remaining gaps for this application.`
          : `This roadmap focuses on building stronger proof for the skills this role expects while staying aligned with ${roleFocus}.`,
      estimated_timeline: gaps.length > 3 ? "10-14 weeks" : "6-10 weeks",
      focus_skills: dedupe([...gaps, ...requiredSkills]).slice(0, 6),
      phases: [
        {
          id: "now",
          title: `Anchor your strongest proof for ${String(job.title || "this role")}`,
          skills: matchedSkills.length > 0 ? matchedSkills : profileSkills.slice(0, 4),
          actions: [
            "Refresh resume bullets so they match the language of this role",
            "Prepare one concrete story for each relevant skill you already have",
            "Keep your best matching project easy to explain in interviews",
          ],
        },
        {
          id: "phase-1",
          title: `Close the clearest gaps for ${String(job.title || "this role")}`,
          skills: gaps.slice(0, 3),
          actions: gaps.slice(0, 3).map((skill) => `Practice ${skill} with a focused mini-project or guided exercise`),
        },
        {
          id: "phase-2",
          title: `Build job-specific proof`,
          skills: dedupe([...requiredSkills.slice(0, 3), "Portfolio Storytelling"]),
          actions: [
            "Create one portfolio artifact that looks relevant to this role",
            "Write concise STAR stories around your strongest experience",
            "Practice explaining tools, tradeoffs, and outcomes out loud",
          ],
        },
        {
          id: "target",
          title: `Become a stronger repeatable match`,
          skills: dedupe([...requiredSkills.slice(0, 3), "Professional Positioning"]),
          actions: [
            "Update your profile with the strongest new proof",
            "Apply the same preparation loop to similar openings",
            "Keep improving the most repeated skills across your target jobs",
          ],
        },
      ],
    };
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let profile: Record<string, unknown> = {};
  let resumeProfile: Record<string, unknown> = {};
  let jobs: Array<Record<string, unknown>> = [];

  try {
    const payload = await request.json();
    profile = payload?.profile && typeof payload.profile === "object" ? payload.profile : {};
    resumeProfile = payload?.resumeProfile && typeof payload.resumeProfile === "object" ? payload.resumeProfile : {};
    jobs = Array.isArray(payload?.jobs) ? payload.jobs.filter(Boolean).slice(0, 3) : [];

    if (jobs.length === 0) {
      return jsonResponse({
        success: true,
        roadmaps: [],
        roadmapEngine: "",
        updatedAt: new Date().toISOString(),
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({
        success: true,
        roadmaps: buildFallbackRoadmaps(profile, resumeProfile, jobs).map((roadmap) => ({
          ...roadmap,
          phases: roadmap.phases.map((phase, index) => buildPhase(index, phase)),
        })),
        roadmapEngine: "local-fallback",
        usedFallback: true,
        fallbackError: "GEMINI_API_KEY is missing in Supabase secrets.",
        updatedAt: new Date().toISOString(),
      });
    }

    const userContext = {
      role: profile.role || "Applicant",
      jobTitle: profile.jobTitle || "",
      about: profile.about || "",
      location: profile.location || "",
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      suggested_roles: Array.isArray(resumeProfile.suggested_roles) ? resumeProfile.suggested_roles : [],
      summary: resumeProfile.summary || "",
      strengths: Array.isArray(resumeProfile.strengths) ? resumeProfile.strengths : [],
      improvement_skills: Array.isArray(resumeProfile.improvement_skills) ? resumeProfile.improvement_skills : [],
    };

    const compactJobs = jobs.map((job) => ({
      id: String(job.id || ""),
      title: String(job.title || ""),
      company_name: String(job.company_name || ""),
      category: String(job.category || ""),
      description: String(job.description || "").replace(/\s+/g, " ").trim().slice(0, 900),
      responsibilities: dedupe(Array.isArray(job.responsibilities) ? job.responsibilities : []).slice(0, 4),
      requiredSkills: dedupe(Array.isArray(job.requiredSkills) ? job.requiredSkills : []).slice(0, 8),
      matchedSkills: dedupe(Array.isArray(job.matchedSkills) ? job.matchedSkills : []).slice(0, 6),
      gaps: dedupe(Array.isArray(job.gaps) ? job.gaps : []).slice(0, 6),
      matchScore: Number(job.matchScore || 0),
    }));

    const prompt = [
      "You are generating highly practical career roadmaps for a student or early-career applicant.",
      "Use the user context and each applied job carefully. Do not invent experience or certifications the user does not have.",
      "Return exactly one roadmap per job, in the same job order provided.",
      "Each roadmap must stay consistent in structure: phases now, phase-1, phase-2, target.",
      "Make the content specific to the job title, required skills, and the user's current strengths and gaps.",
      "Keep fit_summary concise, realistic, and grounded in the user's actual profile.",
      "Each phase title must be distinct and useful, not generic filler.",
      "Each skills list should contain 2 to 6 concrete skills.",
      "Each actions list should contain 2 to 4 concrete, realistic next steps.",
      "",
      `User context: ${JSON.stringify(userContext)}`,
      `Applied jobs: ${JSON.stringify(compactJobs)}`,
    ].join("\n");

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
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: roadmapResponseSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Gemini roadmap request failed with status ${response.status}.`);
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part?.text || "").join("") || "";
    const parsed = JSON.parse(normalizeJsonBlock(rawText));
    const generatedRoadmaps = Array.isArray(parsed?.roadmaps) ? parsed.roadmaps : [];

    const normalizedRoadmaps = compactJobs.map((job, jobIndex) => {
      const generated = generatedRoadmaps[jobIndex] ?? generatedRoadmaps.find((item: Record<string, unknown>) => String(item?.job_id || "") === String(job.id));
      const phases = Array.isArray(generated?.phases) ? generated.phases : [];

      return {
        job_id: String(job.id),
        title: String(generated?.title || job.title || "Applied role"),
        company_name: String(generated?.company_name || job.company_name || "Employer"),
        target_role: String(generated?.target_role || userContext.jobTitle || userContext.suggested_roles?.[0] || "Target role"),
        fit_summary: String(generated?.fit_summary || `This roadmap is aligned to ${job.title} using your current profile strengths and gaps.`),
        estimated_timeline: String(generated?.estimated_timeline || "6-10 weeks"),
        focus_skills: dedupe(Array.isArray(generated?.focus_skills) ? generated.focus_skills : [...job.gaps, ...job.requiredSkills]).slice(0, 6),
        phases: phaseBlueprint.map((_, phaseIndex) => buildPhase(phaseIndex, phases[phaseIndex])),
      };
    });

    return jsonResponse({
      success: true,
      roadmaps: normalizedRoadmaps,
      roadmapEngine: "gemini-2.5-flash",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown roadmap generation error.";
    return jsonResponse({
      success: true,
      roadmaps: buildFallbackRoadmaps(profile, resumeProfile, jobs).map((roadmap) => ({
        ...roadmap,
        phases: roadmap.phases.map((phase, index) => buildPhase(index, phase)),
      })),
      usedFallback: true,
      roadmapEngine: "local-fallback",
      fallbackError: message,
      updatedAt: new Date().toISOString(),
    });
  }
});
