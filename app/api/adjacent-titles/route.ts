import { NextRequest, NextResponse } from "next/server";
import {
  fetchPostingCount,
  fetchTitleCategory,
  normalizeTitle,
  type AdzunaCategory,
  type JobsPayload,
} from "@/lib/adzuna";
import { readFreshRow, readFreshRows, writeCacheRow } from "@/lib/cache";
import { CATEGORY_TITLES, type AdjacentTitle } from "@/lib/adjacent-titles";

const MAX_SUGGESTIONS = 5; // FR5: 3-5 adjacent titles

/**
 * Resolve the title's dominant category, cheapest source first:
 * full cached JobsPayload -> cached category lookup -> one Adzuna call.
 */
async function resolveCategory(title: string): Promise<AdzunaCategory | null> {
  const fullRow = await readFreshRow<JobsPayload>(title);
  if (fullRow && fullRow.results.category !== undefined) {
    return fullRow.results.category;
  }

  const categoryKey = `category:${title}`;
  const cachedLookup = await readFreshRow<{ category: AdzunaCategory | null }>(
    categoryKey
  );
  if (cachedLookup) return cachedLookup.results.category;

  const category = await fetchTitleCategory(title);
  await writeCacheRow(categoryKey, { category });
  return category;
}

/**
 * Posting count per candidate title, cheapest source first: full cached
 * JobsPayload -> cached count row -> one Adzuna call each (in parallel).
 * Candidates whose Adzuna call fails are dropped rather than failing the
 * whole response.
 */
async function resolveCounts(candidates: string[]): Promise<AdjacentTitle[]> {
  const keys = candidates.flatMap((c) => [c, `count:${c}`]);
  const rows = await readFreshRows<JobsPayload | { count: number }>(keys);

  const resolved: AdjacentTitle[] = [];
  const missing: string[] = [];

  for (const candidate of candidates) {
    const full = rows.get(candidate)?.results;
    const light = rows.get(`count:${candidate}`)?.results;
    if (full && "totalCount" in full) {
      resolved.push({ title: candidate, count: full.totalCount });
    } else if (light && "count" in light) {
      resolved.push({ title: candidate, count: light.count });
    } else {
      missing.push(candidate);
    }
  }

  const fetched = await Promise.all(
    missing.map(async (candidate) => {
      try {
        const count = await fetchPostingCount(candidate);
        await writeCacheRow(`count:${candidate}`, { count });
        return { title: candidate, count };
      } catch (error) {
        console.error(`[adjacent-titles] count failed for "${candidate}":`, error);
        return null;
      }
    })
  );

  return [...resolved, ...fetched.filter((t): t is AdjacentTitle => t !== null)];
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

  let category: AdzunaCategory | null;
  try {
    category = await resolveCategory(title);
  } catch (error) {
    // PRD §13.4: never expose the raw API error to the client.
    console.error("[adjacent-titles] category lookup failed:", error);
    return NextResponse.json(
      { error: "Job data is temporarily unavailable. Try again shortly." },
      { status: 502 }
    );
  }

  if (!category) {
    // No postings matched the title, so there is no category to match on.
    return NextResponse.json({ title, category: null, adjacentTitles: [] });
  }

  const candidates = (CATEGORY_TITLES[category.tag] ?? [])
    .filter((candidate) => candidate !== title)
    .slice(0, MAX_SUGGESTIONS);

  const adjacentTitles = (await resolveCounts(candidates)).sort(
    (a, b) => b.count - a.count
  );

  return NextResponse.json({ title, category, adjacentTitles });
}
