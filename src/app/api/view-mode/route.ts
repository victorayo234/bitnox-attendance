import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode");

  const response = NextResponse.redirect(
    new URL(mode === "student" ? "/student" : "/admin", request.url)
  );

  if (mode === "student") {
    response.cookies.set("admin_student_view", "1", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
  } else {
    response.cookies.delete("admin_student_view");
  }

  return response;
}
