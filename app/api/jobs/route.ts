import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchJobsData, normalizeTitle, type JobsPayload } from "@/lib/adzuna";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // PRD §8.1: 24h cache per title

interface CachedRow {
  results: JobsPayload;
  fetched_at: string;
}

function supabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  const rawTitle = request.nextUrl.searchParams.get("title");
  if (!rawTitle || rawTitle.trim() === "") {
    return NextResponse.json(
      { error: "Missing required query param: title" },
      { status: 400 }
    );
  }

  const title = normalizeTitle(rawTitle);
  const supabase = supabaseClient();

  // 1. Fresh cache hit? Return it directly.
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data: cached, error: cacheError } = await supabase
    .from("cached_searches")
    .select("results, fetched_at")
    .eq("title", title)
    .gte("fetched_at", cutoff)
    .maybeSingle<CachedRow>();

  if (cacheError) {
    // A broken cache shouldn't take the tool down; fall through to Adzuna.
    console.error("[jobs] cache lookup failed:", cacheError.message);
  }
  if (cached) {
    return NextResponse.json({
      ...cached.results,
      fetchedAt: cached.fetched_at,
      cached: true,
    });
  }

  // 2. Cache miss or stale: fetch from Adzuna (server-side only).
  let payload: JobsPayload;
  try {
    payload = await fetchJobsData(title);
  } catch (error) {
    // PRD §13.4: never expose the raw API error to the client.
    console.error("[jobs] Adzuna fetch failed:", error);
    return NextResponse.json(
      { error: "Job data is temporarily unavailable. Try again shortly." },
      { status: 502 }
    );
  }

  // 3. Store in the cache. Failure to cache shouldn't fail the request.
  const fetchedAt = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from("cached_searches")
    .upsert(
      { title, results: payload, fetched_at: fetchedAt },
      { onConflict: "title" }
    );
  if (upsertError) {
    console.error("[jobs] cache write failed:", upsertError.message);
  }

  return NextResponse.json({ ...payload, fetchedAt, cached: false });
}
