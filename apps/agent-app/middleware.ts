import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/forbidden(.*)",
  "/api/cron/tick(.*)",
  "/api/telegram/webhook(.*)"
]);

const isApiRoute = createRouteMatcher(["/api/(.*)"]);
const allowedEmails = new Set(
  (process.env.CLERK_ALLOWED_EMAILS ?? "hugo@orchardstreet.xyz")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function getEmailFromSessionClaims(sessionClaims: unknown): string | null {
  if (!sessionClaims || typeof sessionClaims !== "object") {
    return null;
  }

  const claims = sessionClaims as Record<string, unknown>;
  const directCandidates = [
    claims.email,
    claims.primary_email_address,
    claims.primaryEmailAddress,
    claims.primary_email
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase();
    }
  }

  if (Array.isArray(claims.email_addresses)) {
    const primary = claims.email_addresses.find((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      return (entry as Record<string, unknown>).primary === true;
    });

    if (primary && typeof primary === "object") {
      const emailAddress = (primary as Record<string, unknown>).email_address;
      if (typeof emailAddress === "string" && emailAddress.trim().length > 0) {
        return emailAddress.trim().toLowerCase();
      }
    }
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  const authState = await auth();
  await auth.protect();

  const sessionEmail = getEmailFromSessionClaims(authState.sessionClaims);

  if (sessionEmail && allowedEmails.has(sessionEmail)) {
    return;
  }

  if (isApiRoute(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const forbiddenUrl = new URL("/forbidden", req.url);
  return NextResponse.redirect(forbiddenUrl);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
