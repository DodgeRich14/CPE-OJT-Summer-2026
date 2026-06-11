/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-info",
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

function normalizeRole(role: unknown) {
  return ["Applicant", "Student", "Employer", "Admin"].includes(String(role))
    ? String(role)
    : "Applicant";
}

function buildFallbackProfile(user: Record<string, unknown>) {
  const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? {};
  const fullName = String(metadata.full_name || user.email || "Unnamed user").trim();
  const firstName = String(metadata.first_name || fullName.split(" ")[0] || "").trim();
  const lastName = String(metadata.last_name || fullName.split(" ").slice(1).join(" ") || "").trim();

  return {
    id: String(user.id || ""),
    role: normalizeRole(metadata.role),
    status: "Active",
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    username: `@${fullName.toLowerCase().replace(/\s+/g, ".")}`,
    email: String(user.email || ""),
    created_at: user.created_at || new Date().toISOString(),
    location: "",
    job_title: "",
    about: "",
    skills: [],
  };
}

function mergeUserRecord(user: Record<string, unknown>, profile: Record<string, unknown> | null) {
  const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? {};
  const fallback = buildFallbackProfile(user);
  const fullName = String(metadata.full_name || profile?.full_name || fallback.full_name || user.email || "Unnamed user").trim();

  return {
    id: String(user.id || profile?.id || ""),
    full_name: fullName,
    role: normalizeRole(metadata.role || profile?.role || fallback.role),
    status: String(profile?.status || fallback.status || "Active"),
    created_at: user.created_at || profile?.created_at || new Date().toISOString(),
    email: String(user.email || profile?.email || ""),
    username: String(profile?.username || `@${fullName.toLowerCase().replace(/\s+/g, ".")}`),
    location: String(profile?.location || ""),
    job_title: String(profile?.job_title || ""),
    about: String(profile?.about || ""),
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
  };
}

function isCallerAdmin(user: Record<string, unknown>, profile: Record<string, unknown> | null) {
  const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? {};
  return normalizeRole(profile?.role || metadata.role) === "Admin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase credentials are missing.");
    }

    const authHeader = req.headers.get("Authorization") || "";

    const caller = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized." }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await caller
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfileError) {
      return jsonResponse({ success: false, error: callerProfileError.message }, 403);
    }

    if (!isCallerAdmin(user, callerProfile)) {
      return jsonResponse({ success: false, error: "Admin access is required." }, 403);
    }

    const allUsers: Record<string, unknown>[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        throw new Error(error.message);
      }

      const users = data.users ?? [];
      allUsers.push(...users);

      if (users.length < perPage) break;
      page += 1;
    }

    const userIds = allUsers.map((entry) => String(entry.id || "")).filter(Boolean);
    const { data: profiles, error: profilesError } = userIds.length
      ? await admin
          .from("profiles")
          .select("id, full_name, role, status, created_at, email, username, location, job_title, about, skills, first_name, last_name")
          .in("id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const missingProfiles = allUsers
      .filter((entry) => !profileMap.has(String(entry.id || "")))
      .map(buildFallbackProfile);

    if (missingProfiles.length > 0) {
      await admin.from("profiles").upsert(missingProfiles, { onConflict: "id" });
      missingProfiles.forEach((profile) => {
        profileMap.set(String(profile.id), profile);
      });
    }

    const users = allUsers.map((entry) => {
      const profile = profileMap.get(String(entry.id || "")) ?? null;
      return mergeUserRecord(entry, profile);
    });

    return jsonResponse({ success: true, users });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load admin users.",
      },
      500,
    );
  }
});
