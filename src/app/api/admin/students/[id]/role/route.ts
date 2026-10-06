import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Must call requireAdmin() first; return 403 for anyone else
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Forbidden: Active administrator access required" },
      { status: 403 }
    );
  }

  const { id: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "Invalid target user ID" }, { status: 400 });
  }

  // Parse body
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role: newRole } = body;
  if (newRole !== "admin" && newRole !== "student") {
    return NextResponse.json(
      { error: "Invalid role specified. Must be 'admin' or 'student'" },
      { status: 400 }
    );
  }

  // 3. An admin cannot change their own role
  if (adminAuth.user.id === targetUserId) {
    return NextResponse.json(
      { error: "Admins cannot change their own role" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Fetch target user profile
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .single();

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // 2. Only approved, active students can be promoted.
  // Reject pending, rejected, or deactivated accounts with a clear message.
  if (newRole === "admin") {
    if (!targetProfile.is_active) {
      return NextResponse.json(
        { error: "Cannot promote deactivated account. The user must be active." },
        { status: 400 }
      );
    }

    if (targetProfile.status === "pending") {
      return NextResponse.json(
        { error: "Cannot promote a pending enrollment. The student must be approved first." },
        { status: 400 }
      );
    }

    if (targetProfile.status === "rejected") {
      return NextResponse.json(
        { error: "Cannot promote a rejected account." },
        { status: 400 }
      );
    }
  }

  // 3. The last remaining admin can never be demoted.
  if (newRole === "student" && targetProfile.role === "admin") {
    const { count, error: countError } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);

    if (countError || count === null || count <= 1) {
      return NextResponse.json(
        { error: "The last remaining administrator cannot be demoted." },
        { status: 400 }
      );
    }
  }

  // No-op check
  if (targetProfile.role === newRole) {
    return NextResponse.json({
      message: `User is already a ${newRole}`,
      profile: targetProfile,
    });
  }

  // 4. Update the user role
  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId)
    .select()
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      { error: "Failed to update role: " + updateError?.message },
      { status: 500 }
    );
  }

  // 5. Log every role change in role_changes table
  const { error: logError } = await adminClient.from("role_changes").insert({
    changed_by: adminAuth.user.id,
    target_user: targetUserId,
    old_role: targetProfile.role,
    new_role: newRole,
  });

  if (logError) {
    console.error("Warning: Failed to insert audit log in role_changes:", logError);
  }

  return NextResponse.json({
    success: true,
    message: `Role changed successfully to ${newRole}`,
    profile: updatedProfile,
  });
}
