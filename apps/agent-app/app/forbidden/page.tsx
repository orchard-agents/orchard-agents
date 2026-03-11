import { SignOutButton } from "@clerk/nextjs";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 text-neutral-100">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900/80 p-5">
        <p className="mb-1 text-lg font-semibold">Access restricted</p>
        <p className="mb-5 text-sm text-neutral-400">
          This app is currently limited to approved accounts.
        </p>
        <SignOutButton>
          <button className="rounded-lg border border-neutral-700 px-3 py-2 text-sm" type="button">
            Sign out and try another account
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
