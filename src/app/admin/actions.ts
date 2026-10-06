"use server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Server action to approve a pending student enrollment.
 * Verified admin only.
 */
export async function approveStudent(studentId: string) {
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    throw new Error("Unauthorized: Administrator access required");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", studentId);

  if (error) {
    throw new Error("Failed to approve student: " + error.message);
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Server action to reject a pending student enrollment.
 * Verified admin only.
 */
export async function rejectStudent(studentId: string) {
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    throw new Error("Unauthorized: Administrator access required");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", studentId);

  if (error) {
    throw new Error("Failed to reject student: " + error.message);
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { success: true };
}

export interface AddStudentResult {
  error?: string | null;
  success?: boolean;
}

/**
 * Admin shortcut to create an already-approved student account directly.
 * Source of truth: PROJECT_BRIEF.md Task 8
 */
export async function addStudentAction(
  _prevState: AddStudentResult,
  formData: FormData
): Promise<AddStudentResult> {
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return { error: "Unauthorized: Administrator access required" };
  }

  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const adminClient = createAdminClient();

  // 1. Create auth user
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    return { error: createError.message };
  }

  // 2. Ensure profile exists and set status directly to 'approved'
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: created.user.id,
      full_name: fullName,
      email,
      role: "student",
      status: "approved", // Pre-approved shortcut
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { success: true };
}
