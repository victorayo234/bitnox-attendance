import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid, adminActionMutex } from "@/lib/role-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Verify caller is a logged-in, active admin
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: Active administrator access required." },
      { status: 403 }
    );
  }

  // 2. Validate student/user ID param
  const { id: targetUserId } = await params;
  if (!targetUserId || !isValidUuid(targetUserId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid user ID parameter. Must be a valid UUID." },
      { status: 400 }
    );
  }

  // 3. Parse request body
  let body: {
    fullName?: string;
    isActive?: boolean;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request payload." },
      { status: 400 }
    );
  }

  const { fullName, isActive, password } = body;

  // Validate at least one field is provided
  if (fullName === undefined && isActive === undefined && password === undefined) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "At least one field (fullName, isActive, or password) must be provided for update.",
      },
      { status: 400 }
    );
  }

  // Validate individual fields
  if (fullName !== undefined) {
    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Full name must be at least 2 characters long." },
        { status: 400 }
      );
    }
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "isActive must be a boolean." },
      { status: 400 }
    );
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }
  }

  const adminClient = createAdminClient();

  // 4. Fetch target user profile
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    return NextResponse.json(
      { ok: false, error: "User profile not found." },
      { status: 404 }
    );
  }

  // 5. Deactivation Rules & Last-Admin Protection
  if (isActive === false) {
    // An admin cannot deactivate themselves
    if (adminAuth.user.id === targetUserId) {
      return NextResponse.json(
        { ok: false, error: "You cannot deactivate your own account." },
        { status: 400 }
      );
    }

    // Attempt RPC deactivate_user if available
    try {
      const { data: rpcData, error: rpcError } = await adminClient.rpc(
        "deactivate_user",
        {
          p_changed_by: adminAuth.user.id,
          p_target_user: targetUserId,
          p_is_active: false,
        }
      );

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          return NextResponse.json(
            { ok: false, error: rpcData.error || "Failed to deactivate account." },
            { status: 400 }
          );
        }
      }
    } catch {
      // Fall through to mutex guard
    }
  }

  // 6. Mutex lock for race-safe updates
  const releaseLock = await adminActionMutex.acquire();
  try {
    if (isActive === false && targetProfile.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", true)
        .neq("id", targetUserId);

      if (countError || count === null || count === 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "Cannot deactivate the last active administrator.",
          },
          { status: 400 }
        );
      }
    }

    // 7. Update auth password if provided
    if (password !== undefined) {
      const { error: pwdError } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        { password }
      );

      if (pwdError) {
        return NextResponse.json(
          { ok: false, error: "Failed to reset password: " + pwdError.message },
          { status: 400 }
        );
      }
    }

    // 8. Update profile fields if provided (never allow changing role or status here)
    let updatedProfile = targetProfile;
    if (fullName !== undefined || isActive !== undefined) {
      const profileUpdates: { full_name?: string; is_active?: boolean } = {};
      if (fullName !== undefined) {
        profileUpdates.full_name = fullName.trim();
      }
      if (isActive !== undefined) {
        profileUpdates.is_active = isActive;
      }

      const { data: updated, error: updateError } = await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("id", targetUserId)
        .select()
        .single();

      if (updateError || !updated) {
        console.error("Failed to update profile:", updateError);
        return NextResponse.json(
          { ok: false, error: "Failed to update profile. Please try again." },
          { status: 500 }
        );
      }

      updatedProfile = updated;
    }

    return NextResponse.json({
      ok: true,
      message: "Account updated successfully.",
      profile: updatedProfile,
    });
  } finally {
    releaseLock();
  }
}
