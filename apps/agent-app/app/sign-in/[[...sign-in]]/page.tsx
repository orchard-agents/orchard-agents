import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 text-neutral-100">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900/80 p-5">
        <p className="mb-1 text-lg font-semibold">Orchard Mailbox</p>
        <p className="mb-5 text-sm text-neutral-400">Sign in with Google or email and password.</p>
        <SignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/"
          withSignUp={false}
          transferable={false}
        />
      </div>
    </main>
  );
}
