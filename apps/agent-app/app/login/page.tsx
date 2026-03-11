import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedPath = params.next;
  const nextPath = requestedPath && requestedPath.startsWith("/") ? requestedPath : "/";

  return (
    <LoginForm nextPath={nextPath} />
  );
}
