import { NextRequest, NextResponse } from "next/server";
import { fetchJobsData, normalizeTitle, type JobsPayload } from "@/lib/adzuna";
import { readFreshRow, writeCacheRow } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const rawTitle = request.nextUrl.searchParams.get("title");
  if (!rawTitle || rawTitle.trim() === "") {
    return NextResponse.json(
      { error: "Missing required query param: title" },
      { status: 400 }
    );
  }

  const title = normalizeTitle(rawTitle);

  // 1. Fresh cache hit? Return it directly — but only if it already has
  // the monthly series the trend chart needs. Older rows are treated as
  // stale so the next search backfills without waiting out the 24h TTL.
  const cached = await readFreshRow<JobsPayload>(title);
  if (cached?.results.monthlyCounts && cached.results.monthlyCounts.length > 0) {
    return NextResponse.json({
      ...cached.results,
      fetchedAt: cached.fetchedAt,
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

  // 3. Store in the cache. Failure to cache only logs; the response still goes out.
  const fetchedAt = await writeCacheRow(title, payload);

  return NextResponse.json({ ...payload, fetchedAt, cached: false });
}
