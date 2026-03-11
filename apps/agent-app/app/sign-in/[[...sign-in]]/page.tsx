import { redirect } from "next/navigation";

interface LegacySignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function LegacySignInPage({ searchParams }: LegacySignInPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url;

  if (redirectUrl) {
    try {
      const url = new URL(redirectUrl);
      const nextPath = `${url.pathname}${url.search}`;
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    } catch {
      redirect("/login");
    }
  }

  redirect("/login");
}
