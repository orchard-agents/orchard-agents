import { NextResponse } from "next/server";
import { APP_PASSWORD, AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/lib/password-auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password;

  if (!password || password !== APP_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: AUTH_COOKIE_VALUE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
