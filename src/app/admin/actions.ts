"use server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

import {
  checkApprovalRateLimit,
  validateApprovalPayload,
  approvalActionMutex,
} from "@/lib/approval-guard";

/**
 * Unified server action to approve or reject a student enrollment.
 * Enforces:
 * - Verified admin only (requireAdmin)
 * - Rate limiting (30 req / min)
 * - Strict transition validation (pending->approved, pending->rejected, rejected->approved)
 * - Concurrency mutex + guarded DB update
 * - Single transaction atomic decision log write to approval_decisions
 */
export async function decideApprovalAction(
  studentId: string,
  decision: "approved" | "rejected",
  note?: string
) {
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    throw new Error("Unauthorized: Administrator access required");
  }

  const rateLimitResult = checkApprovalRateLimit(adminAuth.user.id, 30, 60_000);
  if (!rateLimitResult.allowed) {
    throw new Error(
      "Too many decision requests. Please wait a moment before trying again."
    );
  }

  const validation = validateApprovalPayload({ studentId, decision, note });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (studentId === adminAuth.user.id) {
    throw new Error("Administrators cannot decide their own enrollment.");
  }

  const releaseLock = await approvalActionMutex.acquire(studentId);
  try {
    const adminClient = createAdminClient();

    // 1. Try atomic Postgres Stored Procedure
    const { data: rpcRes, error: rpcError } = await adminClient.rpc(
      "decide_student_approval",
      {
        p_decided_by: adminAuth.user.id,
        p_student_id: studentId,
        p_decision: decision,
        p_note: validation.data.note,
      }
    );

    if (!rpcError && rpcRes && typeof rpcRes === "object") {
      const resObj = rpcRes as { success: boolean; error?: string };
      if (!resObj.success) {
        throw new Error(resObj.error || "Action could not be completed.");
      }
      revalidatePath("/admin/approvals");
      revalidatePath("/admin/students");
      revalidatePath("/admin");
      return { success: true };
    }

    // 2. Fallback transaction with guarded update and rollback on log error
    const { data: targetProfile, error: fetchError } = await adminClient
      .from("profiles")
      .select("id, role, status, is_active")
      .eq("id", studentId)
      .single();

    if (fetchError || !targetProfile) {
      throw new Error("Student not found.");
    }

    if (targetProfile.role !== "student") {
      throw new Error("Only student enrollments can be decided from this workflow.");
    }

    const previousStatus = targetProfile.status;

    if (previousStatus === "approved") {
      throw new Error("This request has already been decided.");
    }

    if (previousStatus === "rejected" && decision === "rejected") {
      throw new Error("Only rejected requests can be approved from here.");
    }

    const { data: updateData, error: updateError } = await adminClient
      .from("profiles")
      .update({
        status: decision,
        is_active: true,
      })
      .eq("id", studentId)
      .eq("status", previousStatus)
      .select("id");

    if (updateError || !updateData || updateData.length === 0) {
      throw new Error("This request has already been decided.");
    }

    const { error: logError } = await adminClient
      .from("approval_decisions")
      .insert({
        student_id: studentId,
        decided_by: adminAuth.user.id,
        decision,
        note: validation.data.note || null,
        previous_status: previousStatus,
      });

    if (logError) {
      await adminClient
        .from("profiles")
        .update({ status: previousStatus })
        .eq("id", studentId);
      throw new Error("Failed to record decision log. Status change rolled back.");
    }

    revalidatePath("/admin/approvals");
    revalidatePath("/admin/students");
    revalidatePath("/admin");
    return { success: true };
  } finally {
    releaseLock();
  }
}

/**
 * Server action to approve a pending or rejected student enrollment.
 * Verified admin only.
 */
export async function approveStudent(studentId: string, note?: string) {
  return decideApprovalAction(studentId, "approved", note);
}

/**
 * Server action to reject a pending student enrollment.
 * Verified admin only.
 */
export async function rejectStudent(studentId: string, note?: string) {
  return decideApprovalAction(studentId, "rejected", note);
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
