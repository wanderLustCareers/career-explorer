"use client";

import { signOut } from "@/app/login/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-sm text-red-800/70 outline-none hover:text-red-800 focus-visible:ring-2 focus-visible:ring-red-800/40"
      >
        Sign out
      </button>
    </form>
  );
}
