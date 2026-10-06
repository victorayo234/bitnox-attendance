import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Strict protection for /admin/qr: must return 403 for non-admins
  if (pathname === "/admin/qr" || pathname.startsWith("/admin/qr/")) {
    if (!user) {
      return new NextResponse("Forbidden: Administrator access required", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, status")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      profile.role !== "admin" ||
      !profile.is_active ||
      profile.status !== "approved"
    ) {
      return new NextResponse("Forbidden: Administrator access required", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  // Middleware protection: unauthenticated users hitting /student/* or /admin/* go to /login
  if (!user && (pathname.startsWith("/student") || pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "role",
      pathname.startsWith("/admin") ? "admin" : "student"
    );
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
