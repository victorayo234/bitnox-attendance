import { NextRequest, NextResponse } from "next/server";

/**
 * Dev-only helper endpoint to simulate server time during development.
 * Completely disabled in production.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const time = searchParams.get("time");
  const clear = searchParams.get("clear");
  const redirectUrl = searchParams.get("next") || "/student";

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));

  if (clear) {
    response.cookies.delete("dev_mock_time");
    return response;
  }

  if (time) {
    response.cookies.set("dev_mock_time", time, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
  }

  return response;
}
