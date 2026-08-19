"use client";

import { signOut } from "@/app/login/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-sm text-slate outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-teal"
      >
        Sign out
      </button>
    </form>
  );
}
