import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkApprovalRateLimit,
  validateApprovalPayload,
  approvalActionMutex,
} from "@/lib/approval-guard";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  // 1. Authorization: requireAdmin() returns AuthContext or null
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Forbidden: Active administrator access required." },
      { status: 403 }
    );
  }

  // 2. Rate limit: 30 requests per minute per admin
  const rateLimitResult = checkApprovalRateLimit(adminAuth.user.id, 30, 60_000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "Too many decision requests. Please wait a moment before trying again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetInSeconds),
        },
      }
    );
  }

  // 3. Strict payload validation
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload." },
      { status: 400 }
    );
  }

  const validation = validateApprovalPayload(rawBody);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { studentId, decision, note } = validation.data;

  // 4. Target cannot be caller
  if (studentId === adminAuth.user.id) {
    return NextResponse.json(
      { error: "Administrators cannot decide their own enrollment." },
      { status: 400 }
    );
  }

  // 5. Concurrency lock on this student ID to serialize concurrent requests
  const releaseLock = await approvalActionMutex.acquire(studentId);

  try {
    const adminClient = createAdminClient();

    // 6. Attempt atomic execution via Postgres Stored Procedure
    const { data: rpcRes, error: rpcError } = await adminClient.rpc(
      "decide_student_approval",
      {
        p_decided_by: adminAuth.user.id,
        p_student_id: studentId,
        p_decision: decision,
        p_note: note,
      }
    );

    // If RPC executed successfully
    if (!rpcError && rpcRes && typeof rpcRes === "object") {
      const resObj = rpcRes as {
        success: boolean;
        status?: number;
        error?: string;
        decision?: string;
        previous_status?: string;
      };

      if (!resObj.success) {
        return NextResponse.json(
          { error: resObj.error || "Action could not be completed." },
          { status: resObj.status || 400 }
        );
      }

      revalidatePath("/admin/approvals");
      revalidatePath("/admin/students");
      revalidatePath("/admin");

      return NextResponse.json({
        ok: true,
        decision: resObj.decision,
        previous_status: resObj.previous_status,
      });
    }

    // 7. Fallback transaction execution (guarded update + audit log)
    // Fetch target profile
    const { data: targetProfile, error: fetchError } = await adminClient
      .from("profiles")
      .select("id, role, status, is_active")
      .eq("id", studentId)
      .single();

    if (fetchError || !targetProfile) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    if (targetProfile.role !== "student") {
      return NextResponse.json(
        { error: "Only student enrollments can be decided from this workflow." },
        { status: 400 }
      );
    }

    const previousStatus = targetProfile.status;

    // Transition rules:
    // Approved accounts cannot be rejected through this route
    if (previousStatus === "approved") {
      return NextResponse.json(
        { error: "This request has already been decided." },
        { status: 409 }
      );
    }

    // Attempting to reject an already rejected account is a 409
    if (previousStatus === "rejected" && decision === "rejected") {
      return NextResponse.json(
        { error: "Only rejected requests can be approved from here." },
        { status: 409 }
      );
    }

    // Guarded status update (WHERE status = expected previous status)
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
      return NextResponse.json(
        { error: "This request has already been decided." },
        { status: 409 }
      );
    }

    // Insert into approval_decisions
    const { error: logError } = await adminClient
      .from("approval_decisions")
      .insert({
        student_id: studentId,
        decided_by: adminAuth.user.id,
        decision,
        note: note || null,
        previous_status: previousStatus,
      });

    if (logError) {
      // Rollback status update on logging failure
      await adminClient
        .from("profiles")
        .update({ status: previousStatus })
        .eq("id", studentId);

      return NextResponse.json(
        { error: "Failed to record decision log. Status change rolled back." },
        { status: 500 }
      );
    }

    revalidatePath("/admin/approvals");
    revalidatePath("/admin/students");
    revalidatePath("/admin");

    return NextResponse.json({
      ok: true,
      decision,
      previous_status: previousStatus,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  } finally {
    releaseLock();
  }
}
