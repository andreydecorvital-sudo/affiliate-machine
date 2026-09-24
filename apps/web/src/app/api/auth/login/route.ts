import { NextRequest, NextResponse } from "next/server";
import {
  buildOperatorSessionValue,
  OPERATOR_SESSION_COOKIE,
  verifyOperatorPassword
} from "@/lib/single-user-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!verifyOperatorPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const sessionValue = buildOperatorSessionValue();
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);

  if (sessionValue) {
    response.cookies.set(OPERATOR_SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return response;
}
