"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const INVALID = "Invalid email or password.";

export async function signIn(
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return INVALID;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth] sign-in failed:", error.message);
    return INVALID;
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
