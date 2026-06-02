/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
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

    const normalizedRole = ["Applicant", "Employer", "Admin"].includes(role) ? role : "Applicant";
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

    return jsonResponse({
      success: true,
      user: {
        id: data.user?.id ?? "",
        email: data.user?.email ?? "",
        role: normalizedRole,
      },
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
