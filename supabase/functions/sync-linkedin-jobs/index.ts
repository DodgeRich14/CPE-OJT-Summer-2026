import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";

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

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteJobUrl(baseOrigin: string, value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `${baseOrigin}${value}`;
}

function parseJobId(url: string, fallback: string) {
  const indeedJobKey = url.match(/[?&]jk=([^&]+)/i)?.[1];
  if (indeedJobKey) return indeedJobKey;

  const currentJobId = url.match(/currentJobId=(\d+)/i)?.[1];
  if (currentJobId) return currentJobId;

  const trailing = url.match(/-(\d+)(?:[/?]|$)/)?.[1];
  if (trailing) return trailing;

  return fallback;
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
  const lowered = text.toLowerCase();
  return skillDictionary.filter((skill) => lowered.includes(skill)).map((skill) => {
    if (skill === "node") return "Node.js";
    if (skill === "next") return "Next.js";
    return skill
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  });
}

function inferCategory(title: string, description: string) {
  const haystack = `${title} ${description}`.toLowerCase();
  if (haystack.includes("intern")) return "Internship";
  if (haystack.includes("volunteer")) return "Volunteer";
  return "Job";
}

function inferWorkType(text: string) {
  const lowered = text.toLowerCase();
  if (lowered.includes("hybrid")) return "Hybrid";
  if (lowered.includes("remote")) return "Remote";
  if (lowered.includes("on-site") || lowered.includes("onsite")) return "On-site";
  return null;
}

function buildSearchUrl(keyword: string, location: string, start: number) {
  const searchUrl = new URL("https://ph.indeed.com/jobs");
  searchUrl.searchParams.set("q", keyword);
  searchUrl.searchParams.set("l", location);
  searchUrl.searchParams.set("start", String(start));
  return searchUrl.toString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithScraperAsync(targetUrl: string, scraperApiKey: string) {
  const submitResponse = await fetch("https://async.scraperapi.com/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: scraperApiKey,
      url: targetUrl,
      apiParams: {
        render: "true",
        country_code: "ph",
      },
    }),
  });

  if (!submitResponse.ok) {
    throw new Error(`ScraperAPI async submit failed with ${submitResponse.status} for ${targetUrl}`);
  }

  const submitPayload = await submitResponse.json();
  const statusUrl = submitPayload.statusUrl as string | undefined;

  if (!statusUrl) {
    throw new Error("ScraperAPI async response did not include a status URL.");
  }

  for (let attempt = 0; attempt < 18; attempt += 1) {
    await sleep(5000);
    const statusResponse = await fetch(statusUrl);

    if (!statusResponse.ok) {
      throw new Error(`ScraperAPI async poll failed with ${statusResponse.status} for ${targetUrl}`);
    }

    const statusPayload = await statusResponse.json();
    if (statusPayload.status === "finished") {
      return statusPayload.response?.body ?? statusPayload.body ?? "";
    }

    if (statusPayload.status === "failed") {
      throw new Error(`ScraperAPI async job failed for ${targetUrl}`);
    }
  }

  throw new Error(`ScraperAPI async job timed out for ${targetUrl}`);
}

async function fetchWithScraper(targetUrl: string, scraperApiKey: string) {
  const scraperUrl = new URL("https://api.scraperapi.com/");
  scraperUrl.searchParams.set("api_key", scraperApiKey);
  scraperUrl.searchParams.set("url", targetUrl);
  scraperUrl.searchParams.set("render", "true");
  scraperUrl.searchParams.set("country_code", "ph");
  scraperUrl.searchParams.set("keep_headers", "true");

  const response = await fetch(scraperUrl.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    },
  });

  if (response.ok) {
    return response.text();
  }

  if (response.status === 403 || response.status >= 500) {
    return fetchWithScraperAsync(targetUrl, scraperApiKey);
  }

  throw new Error(`ScraperAPI returned ${response.status} for ${targetUrl}`);
}

function parseSearchCards(html: string) {
  const $ = cheerio.load(html);
  const cards: Array<{
    title: string;
    companyName: string;
    location: string;
    detailUrl: string;
    postedText: string;
    snippet: string;
  }> = [];

  $("[data-jk], .job_seen_beacon, .slider_container .slider_item").each((_, element) => {
    const node = $(element);
    const title = normalizeSpace(
      node.find("h2.jobTitle a span, h2.jobTitle a, a[data-testid='job-title'], h2 a").first().text(),
    );
    const companyName = normalizeSpace(
      node.find("[data-testid='company-name'], span.companyName, div.company_location [data-testid='company-name']").first().text(),
    );
    const location = normalizeSpace(
      node.find("[data-testid='text-location'], div.companyLocation, .company_location [data-testid='text-location']").first().text(),
    );
    const detailUrl = absoluteJobUrl(
      "https://ph.indeed.com",
      node.find("h2.jobTitle a, a[data-testid='job-title'], h2 a").first().attr("href"),
    );
    const postedText = normalizeSpace(
      node.find("span[data-testid='myJobsStateDate'], .date, [data-testid='job-age']").first().text(),
    );
    const snippet = normalizeSpace(
      node.find(".job-snippet, [data-testid='job-snippet'], .underShelfFooter, ul").first().text(),
    );

    if (!title || !companyName || !detailUrl) return;

    cards.push({
      title,
      companyName,
      location,
      detailUrl,
      postedText,
      snippet,
    });
  });

  const uniqueCards = new Map<string, (typeof cards)[number]>();
  for (const card of cards) {
    uniqueCards.set(card.detailUrl, card);
  }

  return Array.from(uniqueCards.values());
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
  const scraperApiKey = Deno.env.get("SCRAPERAPI_KEY");
  const jobSyncSecret = Deno.env.get("JOB_SYNC_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !scraperApiKey || !jobSyncSecret) {
    return jsonResponse({ error: "Missing required function secrets." }, 500);
  }

  const providedSecret = req.headers.get("x-job-sync-secret");
  if (providedSecret !== jobSyncSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const keyword = normalizeSpace(body.keyword ?? "frontend internship");
  const location = normalizeSpace(body.location ?? "Philippines");
  const pages = Math.min(Math.max(Number(body.pages ?? 1), 1), 3);
  const jobsPerPage = Math.min(Math.max(Number(body.jobsPerPage ?? 5), 1), 10);
  const approveImported = body.approveImported !== false;

  const { data: runRow, error: runInsertError } = await supabase
    .from("scrape_runs")
    .insert({
      source_platform: "Indeed",
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
    const jobSummaries: Array<{
      title: string;
      companyName: string;
      location: string;
      detailUrl: string;
      postedText: string;
      snippet: string;
    }> = [];

    for (let page = 0; page < pages; page += 1) {
      const start = page * 10;
      const searchUrl = buildSearchUrl(keyword, location, start);
      const searchHtml = await fetchWithScraper(searchUrl, scraperApiKey);
      const pageCards = parseSearchCards(searchHtml).slice(0, jobsPerPage);
      jobSummaries.push(...pageCards);
    }

    const deduped = Array.from(new Map(jobSummaries.map((job) => [job.detailUrl, job])).values());
    const selected = deduped.slice(0, pages * jobsPerPage);

    const jobs = [];
    for (const [index, summary] of selected.entries()) {
      const sourceJobId = parseJobId(summary.detailUrl, `${Date.now()}-${index}`);
      const normalizedHash = await sha256(
        `${summary.title.toLowerCase()}|${summary.companyName.toLowerCase()}|${summary.location.toLowerCase()}`,
      );
      const description = summary.snippet || `${summary.title} role sourced from Indeed.`;
      const responsibilities = summary.snippet ? [summary.snippet] : [];
      const workType = inferWorkType(`${summary.title} ${summary.snippet}`);
      const skills = extractSkills(`${summary.title} ${summary.snippet}`);

      jobs.push({
        title: summary.title,
        company_name: summary.companyName,
        category: inferCategory(summary.title, description),
        location: summary.location || location,
        work_type: workType,
        description,
        responsibilities,
        required_skills: skills,
        nice_to_have_skills: [] as string[],
        benefits: [] as string[],
        application_url: summary.detailUrl,
        status: "Open",
        review_status: approveImported ? "Approved" : "Pending",
        source_platform: "Indeed",
        source_type: "scraped",
        source_url: summary.detailUrl,
        source_job_id: sourceJobId,
        normalized_hash: normalizedHash,
        raw_payload: {
          posted_text: summary.postedText,
          snippet: summary.snippet,
        },
        scraped_at: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        salary_currency: "PHP",
        salary_interval: "monthly",
      });
    }

    const sourceIds = jobs.map((job) => job.source_job_id);
    const { data: existingJobs } = await supabase
      .from("jobs")
      .select("source_job_id")
      .eq("source_platform", "Indeed")
      .in("source_job_id", sourceIds);

    const existingSet = new Set((existingJobs ?? []).map((job) => job.source_job_id));
    const jobsInserted = jobs.filter((job) => !existingSet.has(job.source_job_id)).length;
    const jobsUpdated = jobs.length - jobsInserted;

    const { data: upsertedJobs, error: upsertError } = await supabase
      .from("jobs")
      .upsert(jobs, { onConflict: "source_platform,source_job_id" })
      .select("id, title, company_name, source_job_id");

    if (upsertError) {
      throw upsertError;
    }

    await supabase
      .from("scrape_runs")
      .update({
        status: "Completed",
        jobs_found: jobs.length,
        jobs_inserted: jobsInserted,
        jobs_updated: jobsUpdated,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return jsonResponse({
      success: true,
      jobsFound: jobs.length,
      jobsInserted,
      jobsUpdated,
      jobs: upsertedJobs,
    });
  } catch (error) {
    await supabase
      .from("scrape_runs")
      .update({
        status: "Failed",
        error_message: error instanceof Error ? error.message : "Unknown scraper failure",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown scraper failure",
      },
      500,
    );
  }
});
