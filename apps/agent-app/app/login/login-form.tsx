"use client";

import { FormEvent, useState } from "react";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Login failed");
      }

      window.location.href = nextPath;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 text-neutral-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900/80 p-5"
      >
        <p className="mb-1 text-lg font-semibold">Orchard Mailbox</p>
        <p className="mb-4 text-sm text-neutral-400">Enter password to continue.</p>

        <label className="mb-2 block text-sm text-neutral-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-60"
        >
          {isSubmitting ? "Checking..." : "Unlock"}
        </button>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </form>
    </main>
  );
}
