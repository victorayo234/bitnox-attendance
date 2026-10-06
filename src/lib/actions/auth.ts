"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface LoginActionState {
  error?: string | null;
  timestamp?: number;
}

/**
 * Server action to authenticate user with role verification.
 * Source of truth: PROJECT_BRIEF.md
 */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const expectedRole = (formData.get("role") as string) || "student";
  const nextParam = (formData.get("next") as string) || "";

  if (!email || !password) {
    return { error: "Please enter both email and password.", timestamp: Date.now() };
  }

  const supabase = await createClient();

  // 1. Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    if (authError?.message.toLowerCase().includes("invalid login credentials")) {
      return {
        error: "Invalid email or password. Please verify your credentials.",
        timestamp: Date.now(),
      };
    }
    return {
      error: authError?.message || "Failed to sign in. Please try again.",
      timestamp: Date.now(),
    };
  }

  const userId = authData.user.id;

  // 2. Load the profile on the server
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      error: "Profile not found. Please contact the administrator.",
      timestamp: Date.now(),
    };
  }

  // 3. Check is_active
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "This account has been deactivated. Contact the admin.",
      timestamp: Date.now(),
    };
  }

  // 4. Check if account's role matches chosen entrance
  if (profile.role !== expectedRole) {
    await supabase.auth.signOut();
    return {
      error: `This account is not a ${expectedRole} account.`,
      timestamp: Date.now(),
    };
  }

  // 5. Safe redirection
  let destination = profile.role === "admin" ? "/admin" : "/student";

  // Validate nextParam: must be same-origin path starting with / and not //
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    if (profile.role === "student" && nextParam.startsWith("/admin")) {
      destination = "/student";
    } else {
      destination = nextParam;
    }
  }

  redirect(destination);
}

/**
 * Server action to log out user and redirect to landing page
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
