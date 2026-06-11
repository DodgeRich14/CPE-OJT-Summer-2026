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

function isCallerAdmin(user: Record<string, unknown>, profile: Record<string, unknown> | null) {
  const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? {};
  return normalizeRole(profile?.role || metadata.role) === "Admin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
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

    const body = await req.json();
    const action = String(body.action || "list");

    if (action === "list") {
      const { data, error } = await admin
        .from("announcements")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Unable to load announcements.");
      }

      return jsonResponse({ success: true, announcements: data ?? [] });
    }

    if (action === "create") {
      const payload = body.payload ?? {};
      const { data, error } = await admin
        .from("announcements")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message || "Unable to create announcement.");
      }

      return jsonResponse({ success: true, announcement: data });
    }

    if (action === "toggle") {
      const announcementId = String(body.announcementId || "");
      const nextActive = Boolean(body.nextActive);

      if (!announcementId) {
        return jsonResponse({ success: false, error: "Announcement ID is required." }, 400);
      }

      const { data, error } = await admin
        .from("announcements")
        .update({ is_active: nextActive })
        .eq("id", announcementId)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message || "Unable to update announcement.");
      }

      return jsonResponse({ success: true, announcement: data });
    }

    return jsonResponse({ success: false, error: "Unknown action." }, 400);
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Announcement management failed.",
      },
      500,
    );
  }
});
