"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export interface LoginActionState {
  error?: string | null;
  timestamp?: number;
}

export interface SignupActionState {
  error?: string | null;
  success?: boolean;
  message?: string | null;
  timestamp?: number;
}

/**
 * Server action to authenticate user with role and status verification.
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

  // 2. Load the profile on the server using admin client to ensure all columns are available
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, status, is_active, full_name")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      error: "Profile not found. Please contact the administrator.",
      timestamp: Date.now(),
    };
  }

  // 3. Check is_active (master killswitch)
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "This account has been deactivated. Contact the admin.",
      timestamp: Date.now(),
    };
  }

  // 4. Check enrollment status for students
  if (profile.role === "student") {
    if (profile.status === "pending") {
      await supabase.auth.signOut();
      return {
        error:
          "Your enrollment is pending administrator approval. Please contact Bitnox administration to activate your account.",
        timestamp: Date.now(),
      };
    }
    if (profile.status === "rejected") {
      await supabase.auth.signOut();
      return {
        error:
          "Your enrollment request was not approved. Please contact Bitnox administration.",
        timestamp: Date.now(),
      };
    }
  }

  // 5. Check if account's role matches chosen entrance
  if (profile.role !== expectedRole) {
    await supabase.auth.signOut();
    return {
      error: `This account is not a ${expectedRole} account.`,
      timestamp: Date.now(),
    };
  }

  // 6. Safe redirection
  let destination = profile.role === "admin" ? "/admin" : "/student";

  // Validate nextParam: must be strictly a same-origin relative path, no backslashes, no scheme
  if (
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.includes("\\")
  ) {
    try {
      const parsed = new URL(nextParam, "https://bitnox.internal");
      if (parsed.origin === "https://bitnox.internal") {
        const path = parsed.pathname + parsed.search;
        if (profile.role === "student" && path.startsWith("/admin")) {
          destination = "/student";
        } else {
          destination = path;
        }
      }
    } catch {
      // Fallback to safe destination
    }
  }

  redirect(destination);
}

/**
 * Public Student Sign-Up Server Action.
 * SECURITY: ALWAYS forces role='student' and status='pending'.
 * Never reads role or status from client input or metadata.
 */
export async function signupStudentAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!fullName || !email || !password || !confirmPassword) {
    return { error: "Please fill in all required fields.", timestamp: Date.now() };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", timestamp: Date.now() };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", timestamp: Date.now() };
  }

  const adminClient = createAdminClient();

  // 1. Create auth user with service role
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already registered")) {
      return {
        error: "An account with this email already exists. Please log in instead.",
        timestamp: Date.now(),
      };
    }
    return { error: createError.message, timestamp: Date.now() };
  }

  const userId = created.user.id;

  // 2. Insert into profiles with strictly forced role='student' and status='pending'
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      email,
      role: "student", // Strictly hardcoded on server
      status: "pending", // Strictly hardcoded on server
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return {
      error: "Account created but failed to initialize profile. Please contact admin.",
      timestamp: Date.now(),
    };
  }

  return {
    success: true,
    message:
      "Registration submitted successfully! Your account is pending administrator approval. Once approved, you will be able to log in and record attendance.",
    timestamp: Date.now(),
  };
}

/**
 * Admin action: Approve student enrollment.
 */
export async function approveStudentAction(studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminClient = createAdminClient();
  const { data: caller } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "admin") {
    throw new Error("Only administrators can approve students.");
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", studentId);

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Admin action: Promote approved student to admin.
 * Enforces:
 * - Caller must be an admin.
 * - Admin cannot change their own role.
 * - Target must be approved.
 */
export async function promoteToAdminAction(studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (user.id === studentId) {
    throw new Error("Admins cannot change their own role.");
  }

  const adminClient = createAdminClient();
  const { data: caller } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "admin") {
    throw new Error("Only administrators can promote users.");
  }

  const { data: target } = await adminClient
    .from("profiles")
    .select("status, role")
    .eq("id", studentId)
    .single();

  if (!target || target.status !== "approved") {
    throw new Error("Only approved students can be promoted to administrator.");
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", studentId);

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Admin action: Demote admin to student.
 * Enforces:
 * - Caller must be an admin.
 * - Admin cannot demote themselves.
 * - The last remaining active admin cannot be demoted.
 */
export async function demoteToStudentAction(adminId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (user.id === adminId) {
    throw new Error("Admins cannot change their own role.");
  }

  const adminClient = createAdminClient();
  const { data: caller } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "admin") {
    throw new Error("Only administrators can demote users.");
  }

  // Count active admins
  const { count, error: countError } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true);

  if (countError || count === null || count <= 1) {
    throw new Error("The last remaining administrator cannot be demoted.");
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ role: "student" })
    .eq("id", adminId);

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Server action to log out user and redirect to landing page.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
