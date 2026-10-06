import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkRoleChangeRateLimit,
  isValidUuid,
  adminActionMutex,
} from "@/lib/role-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Must call requireAdmin() first; anyone else gets 403
  // Role is always re-read from the profiles table on the database server.
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Forbidden: Active administrator access required." },
      { status: 403 }
    );
  }

  // 2. Rate limit the route (20 requests per minute per admin)
  const rateLimitResult = checkRoleChangeRateLimit(adminAuth.user.id, 20, 60_000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many role change requests. Please wait a moment before trying again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetInSeconds),
        },
      }
    );
  }

  // 3. Strict UUID validation on target id
  const { id: targetUserId } = await params;
  if (!targetUserId || !isValidUuid(targetUserId)) {
    return NextResponse.json(
      { error: "Invalid student ID parameter. Must be a valid UUID." },
      { status: 400 }
    );
  }

  // 4. Validate body strictly: must be exactly { role: "admin" | "student" }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload." },
      { status: 400 }
    );
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "role") {
    return NextResponse.json(
      {
        error:
          "Invalid request body. Exactly one property 'role' is required with no additional fields.",
      },
      { status: 400 }
    );
  }

  const newRole = body.role;
  if (newRole !== "admin" && newRole !== "student") {
    return NextResponse.json(
      { error: "Invalid role specified. Role must be 'admin' or 'student'." },
      { status: 400 }
    );
  }

  // 5. Demotion rule: An admin cannot change their own role
  if (adminAuth.user.id === targetUserId) {
    return NextResponse.json(
      { error: "You cannot change your own role." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // 6. Attempt atomic execution via Postgres RPC function `change_user_role`
  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc(
      "change_user_role",
      {
        p_changed_by: adminAuth.user.id,
        p_target_user: targetUserId,
        p_new_role: newRole,
      }
    );

    // If RPC exists and returned a result
    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return NextResponse.json(
          { error: rpcData.error || "Failed to update role." },
          { status: 400 }
        );
      }

      if (rpcData.noop) {
        return NextResponse.json({
          message: rpcData.message || `User is already an ${newRole}.`,
          unchanged: true,
        });
      }

      return NextResponse.json({
        success: true,
        message:
          newRole === "admin"
            ? "User promoted to admin successfully."
            : "Admin access removed successfully.",
      });
    }
  } catch {
    // Continue to atomic mutex fallback if RPC is not deployed in Supabase yet
  }

  // 7. Atomic Mutex Fallback (Race-safe within Node.js)
  const releaseLock = await adminActionMutex.acquire();
  try {
    // Fetch target user profile
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 404 }
      );
    }

    // Idempotency: if already in the target role, change nothing
    if (targetProfile.role === newRole) {
      return NextResponse.json({
        message: `User is already an ${newRole}.`,
        unchanged: true,
      });
    }

    // Promotion rules
    if (newRole === "admin") {
      if (!targetProfile.is_active) {
        return NextResponse.json(
          {
            error:
              "Cannot promote a deactivated account. Only active accounts can be promoted.",
          },
          { status: 400 }
        );
      }

      if (targetProfile.status !== "approved") {
        return NextResponse.json(
          {
            error:
              "Only approved, active students can be promoted.",
          },
          { status: 400 }
        );
      }
    }

    // Demotion rules: Protect the last active admin
    if (newRole === "student" && targetProfile.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", true);

      if (countError || count === null || count <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin." },
          { status: 400 }
        );
      }
    }

    // Perform role update
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update role. Please try again." },
        { status: 500 }
      );
    }

    // Audit log write into role_changes
    const { error: logError } = await adminClient.from("role_changes").insert({
      changed_by: adminAuth.user.id,
      target_user: targetUserId,
      old_role: targetProfile.role,
      new_role: newRole,
    });

    if (logError) {
      // Rollback role update to maintain transactional integrity
      await adminClient
        .from("profiles")
        .update({ role: targetProfile.role })
        .eq("id", targetUserId);

      return NextResponse.json(
        {
          error:
            "Failed to record role audit log. Role change was rolled back.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        newRole === "admin"
          ? "User promoted to admin successfully."
          : "Admin access removed successfully.",
    });
  } finally {
    releaseLock();
  }
}
