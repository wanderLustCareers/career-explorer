"use client";

import { useActionState } from "react";
import { signIn } from "@/app/login/actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="rounded-xl border border-teal-tint bg-white px-4 py-3 text-base text-ink outline-none focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-xl border border-teal-tint bg-white px-4 py-3 text-base text-ink outline-none focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal"
        />
      </label>
      {error && <p className="text-sm text-slate">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-xl bg-teal px-4 py-3 text-sm font-medium text-white outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
