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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { email, password, fullName, firstName, lastName, role } = await req.json();

    if (!email || !password || !fullName) {
      return jsonResponse({ success: false, error: "Email, password, and full name are required." });
    }

    const normalizedRole = normalizeRole(role);
    const normalizedEmail = String(email).trim().toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service credentials are missing.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: existingProfile, error: existingProfileError } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingProfileError) {
      throw new Error(existingProfileError.message);
    }

    if (existingProfile) {
      return jsonResponse({ success: false, error: "An account with this email already exists. Log in instead." });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(fullName).trim(),
        first_name: String(firstName || "").trim(),
        last_name: String(lastName || "").trim(),
        role: normalizedRole,
      },
    });

    if (error) {
      const normalizedMessage = error.message.toLowerCase();

      if (normalizedMessage.includes("already") || normalizedMessage.includes("duplicate")) {
        return jsonResponse({ success: false, error: "An account with this email already exists. Log in instead." });
      }

      return jsonResponse({ success: false, error: error.message });
    }

    const createdUser = data.user;
    const profilePayload = {
      id: createdUser?.id ?? "",
      role: normalizedRole,
      status: "Active",
      full_name: String(fullName).trim(),
      first_name: String(firstName || "").trim(),
      last_name: String(lastName || "").trim(),
      username: `@${String(fullName).trim().toLowerCase().replace(/\s+/g, ".")}`,
      email: normalizedEmail,
    };

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    return jsonResponse({
      success: true,
      user: {
        id: createdUser?.id ?? "",
        email: createdUser?.email ?? "",
        role: normalizedRole,
      },
      profileWarning: profileError?.message ?? "",
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "User registration failed.",
      },
      500,
    );
  }
});
