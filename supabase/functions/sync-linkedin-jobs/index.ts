import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-job-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const skillDictionary = [
  "react",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "sql",
  "postgresql",
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
  "firmware",
  "embedded",
  "microcontroller",
  "arduino",
  "raspberry pi",
  "robotics",
  "iot",
  "linux",
  "qa",
  "technical support",
  "network",
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
  "admin",
  "human resources",
  "front end",
  "full-stack",
  "e-commerce",
  "troubleshooting",
  "networking",
  "reporting",
  "scheduling",
  "reconciliation",
  "financial reporting",
  "bookkeeping",
  "invoicing",
  "problem solving",
  "onboarding",
  "employee relations",
  "operations",
  "operations management",
  "people management",
  "sla management",
  "content strategy",
  "research",
  "quality assurance",
  "bug tracking",
  "test cases",
  "test planning",
  "regression testing",
  "frontend development",
  "full stack development",
  "data engineering",
  "etl",
  "apis",
  "hardware support",
  "software support",
  "process improvement",
  "process analysis",
  "engineering design",
  "technical documentation",
  "calculations",
  "procurement",
  "inventory management",
  "analysis",
  "programming",
  "merchandising",
  "saas",
];

type JSearchJob = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function sha256(input: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extractSkills(text: string) {
  const sanitizedText = text
    .replace(/\bPHP\s?\d[\d,]*(?:\.\d+)?(?:\s*-\s*PHP\s?\d[\d,]*(?:\.\d+)?)?/gi, " ")
    .replace(/\b₱\s?\d[\d,]*(?:\.\d+)?/g, " ");
  const lowered = sanitizedText.toLowerCase();
  const skills = new Map<string, string>();

  for (const skill of skillDictionary) {
    const pattern = skill === "c#"
      ? /\bc#\b/i
      : new RegExp(`\\b${escapeRegex(skill).replace(/\s+/g, "\\s+")}\\b`, "i");
    if (!pattern.test(lowered)) continue;

    let label = skill;
    if (skill === "node") label = "Node.js";
    else if (skill === "next") label = "Next.js";
    else if (skill === "hr" || skill === "human resources") label = "HR";
    else if (skill === "admin") label = "Administration";
    else if (skill === "crm") label = "CRM";
    else if (skill === "qa") label = "QA";
    else if (skill === "sql") label = "SQL";
    else if (skill === "html") label = "HTML";
    else if (skill === "css") label = "CSS";
    else if (skill === "etl") label = "ETL";
    else if (skill === "apis") label = "APIs";
    else if (skill === "saas") label = "SaaS";
    else if (skill === "front end") label = "Frontend Development";
    else if (skill === "full-stack") label = "Full Stack Development";
    else if (skill === "e-commerce") label = "E-Commerce";
    else {
      label = skill
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }

    skills.set(label.toLowerCase(), label);
  }

  return Array.from(skills.values());
}

function inferCategory(title: string, description: string) {
  const haystack = `${title} ${description}`.toLowerCase();
  if (haystack.includes("intern")) return "Internship";
  if (haystack.includes("volunteer")) return "Volunteer";
  return "Job";
}

function inferWorkType(...values: string[]) {
  const lowered = values.join(" ").toLowerCase();
  if (lowered.includes("hybrid")) return "Hybrid";
  if (lowered.includes("remote")) return "Remote";
  if (lowered.includes("on-site") || lowered.includes("onsite")) return "On-site";
  return null;
}

function toIsoDate(value: unknown) {
  if (!value) return new Date().toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toNullableIsoDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeString(value: unknown) {
  return typeof value === "string" ? normalizeSpace(value) : "";
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown JSearch failure";
  }
}

function buildSearchQuery(keyword: string, location: string) {
  const normalizedKeyword = normalizeSpace(keyword || "developer");
  const normalizedLocation = normalizeSpace(location || "Philippines");
  const lowerKeyword = normalizedKeyword.toLowerCase();
  if (lowerKeyword.includes(" in ")) return normalizedKeyword;
  if (lowerKeyword.includes(" jobs")) return `${normalizedKeyword} in ${normalizedLocation}`;
  return `${normalizedKeyword} jobs in ${normalizedLocation}`;
}

function parseJSearchJobs(payload: Record<string, unknown>) {
  const collections = [
    (payload.data as Record<string, unknown> | undefined)?.jobs,
    payload.data,
    payload.jobs,
    payload.results,
    payload.job_results,
  ];

  const firstArray = collections.find((value) => Array.isArray(value));
  return Array.isArray(firstArray) ? (firstArray as JSearchJob[]) : [];
}

function normalizeSourcePlatform(value: string) {
  const source = normalizeSpace(value || "");
  if (!source) return "JSearch";

  const lowered = source.toLowerCase();
  if (lowered.includes("linkedin")) return "LinkedIn";
  if (lowered.includes("indeed")) return "Indeed";
  if (lowered.includes("glassdoor")) return "Glassdoor";
  if (lowered.includes("ziprecruiter")) return "ZipRecruiter";
  if (lowered.includes("jobstreet")) return "JobStreet";
  if (lowered.includes("kalibrr")) return "Kalibrr";
  if (lowered.includes("google")) return "Google Jobs";
  return source;
}

function isPlaceholderListing(title: string, description: string) {
  const haystack = `${title} ${description}`.toLowerCase();
  return (
    haystack.includes("view similar jobs with this employer") ||
    haystack.includes("view similar jobs") ||
    haystack.includes("similar jobs with this employer")
  );
}

function isExpiredDate(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

async function fetchJSearchJobs(apiKey: string, query: string, page: number) {
  const url = new URL("https://api.openwebninja.com/jsearch/search-v2");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`JSearch returned ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function mapJSearchJob(job: JSearchJob, fallbackLocation: string) {
  const title = safeString(job.job_title ?? job.title);
  const companyName = safeString(job.employer_name ?? job.company_name ?? job.company);
  const description = safeString(job.job_description ?? job.description) || `${title} role imported from JSearch.`;
  const locationParts = [
    safeString(job.job_city),
    safeString(job.job_state),
    safeString(job.job_country),
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : safeString(job.job_location) || fallbackLocation;
  const applyUrl = safeString(job.job_apply_link ?? job.job_google_link);
  const sourceUrl = safeString(job.job_google_link ?? job.job_apply_link);
  const sourceJobId = safeString(job.job_id ?? job.id) || `${title}-${companyName}-${location}`;
  const expiresAt = toNullableIsoDate(job.job_offer_expiration_datetime_utc ?? job.job_offer_expiration_timestamp);
  const sourcePlatform = normalizeSourcePlatform(
    safeString(job.job_publisher ?? job.job_source ?? job.publisher ?? job.source ?? job.detected_extensions),
  );
  const workType = inferWorkType(
    safeString(job.job_employment_type),
    description,
    safeString(job.job_is_remote) === "true" ? "remote" : "",
  );
  const requiredSkills = extractSkills(`${title} ${description}`);
  const minSalary = toNumber(job.job_min_salary);
  const maxSalary = toNumber(job.job_max_salary);
  const salaryCurrency = safeString(job.job_salary_currency);
  const salaryInterval = safeString(job.job_salary_period);

  return {
    title,
    company_name: companyName,
    category: inferCategory(title, description),
    location,
    work_type: workType,
    description,
    responsibilities: [] as string[],
    required_skills: requiredSkills,
    nice_to_have_skills: [] as string[],
    benefits: [] as string[],
    application_url: applyUrl || sourceUrl || null,
    status: isExpiredDate(expiresAt) ? "Closed" : "Open",
    review_status: "Approved",
    source_platform: sourcePlatform,
    source_type: "federated",
    source_url: sourceUrl || applyUrl || null,
    source_job_id: sourceJobId,
    raw_payload: job,
    scraped_at: new Date().toISOString(),
    posted_at: toIsoDate(job.job_posted_at_datetime_utc ?? job.job_posted_at_timestamp ?? job.job_posted_at),
    expires_at: expiresAt,
    salary_min: minSalary,
    salary_max: maxSalary,
    salary_currency: salaryCurrency || "PHP",
    salary_interval:
      salaryInterval && ["hourly", "daily", "weekly", "monthly", "yearly", "fixed"].includes(salaryInterval.toLowerCase())
        ? salaryInterval.toLowerCase()
        : "monthly",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const jsearchApiKey = Deno.env.get("JSEARCH_API_KEY");
  const jobSyncSecret = Deno.env.get("JOB_SYNC_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !jsearchApiKey || !jobSyncSecret) {
    return jsonResponse({ error: "Missing required function secrets." }, 500);
  }

  const providedSecret = req.headers.get("x-job-sync-secret");
  if (providedSecret !== jobSyncSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = await req.json().catch(() => ({}));
  const keyword = normalizeSpace(body.keyword ?? "developer");
  const location = normalizeSpace(body.location ?? "Philippines");
  const pages = Math.min(Math.max(Number(body.pages ?? 1), 1), 3);
  const jobsPerPage = Math.min(Math.max(Number(body.jobsPerPage ?? 8), 1), 20);
  const closeStaleAfterDays = Math.min(Math.max(Number(body.closeStaleAfterDays ?? 7), 1), 30);
  const approveImported = body.approveImported !== false;
  const query = buildSearchQuery(keyword, location);

  const { data: runRow, error: runInsertError } = await supabase
    .from("scrape_runs")
    .insert({
      source_platform: "JSearch",
      keywords: [keyword],
      location,
      status: "Running",
    })
    .select("id")
    .single();

  if (runInsertError) {
    return jsonResponse({ error: runInsertError.message }, 500);
  }

  try {
    const importedJobs: Array<Record<string, unknown>> = [];

    for (let page = 1; page <= pages; page += 1) {
      const payload = await fetchJSearchJobs(jsearchApiKey, query, page);
      const jobs = parseJSearchJobs(payload).slice(0, jobsPerPage);

      for (const job of jobs) {
        const mapped = mapJSearchJob(job, location);

        if (
          !mapped.title ||
          !mapped.company_name ||
          !mapped.source_job_id ||
          (!mapped.application_url && !mapped.source_url) ||
          isPlaceholderListing(String(mapped.title), String(mapped.description))
        ) {
          continue;
        }

        const normalizedHash = await sha256(
          `${mapped.title.toLowerCase()}|${mapped.company_name.toLowerCase()}|${mapped.location.toLowerCase()}`,
        );

        importedJobs.push({
          ...mapped,
          review_status: approveImported ? "Approved" : "Pending",
          normalized_hash: normalizedHash,
        });
      }
    }

    const dedupedJobs = Array.from(
      new Map(importedJobs.map((job) => [`${job.source_platform}:${job.source_job_id}`, job])).values(),
    );

    const sourceIds = dedupedJobs.map((job) => String(job.source_job_id));
    const { data: existingJobs } = sourceIds.length > 0
      ? await supabase
          .from("jobs")
          .select("source_platform, source_job_id")
          .in("source_job_id", sourceIds)
      : { data: [] };

    const existingSet = new Set(
      (existingJobs ?? []).map((job) => `${job.source_platform}:${job.source_job_id}`),
    );
    const jobsInserted = dedupedJobs.filter((job) => !existingSet.has(`${job.source_platform}:${job.source_job_id}`)).length;
    const jobsUpdated = dedupedJobs.length - jobsInserted;

    const { data: upsertedJobs, error: upsertError } = await supabase
      .from("jobs")
      .upsert(dedupedJobs, { onConflict: "source_platform,source_job_id" })
      .select("id, title, company_name, source_job_id");

    if (upsertError) {
      throw upsertError;
    }

    const staleCleanupThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * closeStaleAfterDays).toISOString();
    const activeSourceIds = dedupedJobs.map((job) => String(job.source_job_id)).filter(Boolean);
    let staleCleanupQuery = supabase
      .from("jobs")
      .update({ status: "Closed", updated_at: new Date().toISOString() })
      .eq("source_type", "federated")
      .eq("status", "Open")
      .lte("scraped_at", staleCleanupThreshold);

    if (activeSourceIds.length > 0) {
      staleCleanupQuery = staleCleanupQuery.not("source_job_id", "in", `(${activeSourceIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",")})`);
    }

    const { error: staleCleanupError } = await staleCleanupQuery;
    if (staleCleanupError) {
      throw staleCleanupError;
    }

    await supabase
      .from("jobs")
      .update({ status: "Closed", updated_at: new Date().toISOString() })
      .eq("source_type", "federated")
      .eq("status", "Open")
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString());

    await supabase
      .from("scrape_runs")
      .update({
        source_platform: "JSearch",
        status: "Completed",
        jobs_found: dedupedJobs.length,
        jobs_inserted: jobsInserted,
        jobs_updated: jobsUpdated,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return jsonResponse({
      success: true,
      source: "JSearch",
      query,
      jobsFound: dedupedJobs.length,
      jobsInserted,
      jobsUpdated,
      jobs: upsertedJobs,
    });
  } catch (error) {
    await supabase
      .from("scrape_runs")
      .update({
        source_platform: "JSearch",
        status: "Failed",
        error_message: formatErrorMessage(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return jsonResponse(
      {
        error: formatErrorMessage(error),
      },
      500,
    );
  }
});
