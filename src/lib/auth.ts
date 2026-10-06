import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types";

export interface AuthContext {
  user: { id: string; email: string };
  profile: Profile;
}

/**
 * Validates that the current request is from an authenticated, active, approved administrator.
 * Returns AuthContext if valid, or null if unauthorized.
 */
export async function requireAdmin(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    profile.status !== "approved" ||
    profile.role !== "admin"
  ) {
    return null;
  }

  return {
    user: { id: user.id, email: user.email },
    profile: profile as Profile,
  };
}
