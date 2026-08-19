/**
 * Shared 24h read-through cache over the Supabase `cached_searches` table
 * (PRD §8.1 / FR2). Used by both /api/jobs and /api/adjacent-titles.
 *
 * Row keys are normalized titles, optionally namespaced with a prefix for
 * lightweight entries (e.g. "count:data analyst", "category:data analyst")
 * so they never collide with full JobsPayload rows.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheRow<T> {
  results: T;
  fetchedAt: string;
}

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}

/** Batch-read cache rows fresher than 24h, keyed by title. */
export async function readFreshRows<T>(
  keys: string[]
): Promise<Map<string, CacheRow<T>>> {
  if (keys.length === 0) return new Map();

  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data, error } = await supabase()
    .from("cached_searches")
    .select("title, results, fetched_at")
    .in("title", keys)
    .gte("fetched_at", cutoff);

  if (error) {
    // A broken cache shouldn't take the tool down; treat as a miss.
    console.error("[cache] read failed:", error.message);
    return new Map();
  }
  return new Map(
    data.map((row) => [
      row.title as string,
      { results: row.results as T, fetchedAt: row.fetched_at as string },
    ])
  );
}

export async function readFreshRow<T>(key: string): Promise<CacheRow<T> | null> {
  return (await readFreshRows<T>([key])).get(key) ?? null;
}

/** Upsert a cache row. Returns the fetched_at written. Failures only log. */
export async function writeCacheRow(
  key: string,
  results: unknown
): Promise<string> {
  const fetchedAt = new Date().toISOString();
  const { error } = await supabase()
    .from("cached_searches")
    .upsert(
      { title: key, results, fetched_at: fetchedAt },
      { onConflict: "title" }
    );
  if (error) {
    console.error("[cache] write failed:", error.message);
  }
  return fetchedAt;
}
