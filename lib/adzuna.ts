/**
 * Server-only Adzuna client. Uses ADZUNA_APP_ID / ADZUNA_APP_KEY, which must
 * never be exposed to the browser — this module is only imported from API
 * route handlers.
 */

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/us";

export interface AdzunaCategory {
  tag: string;
  label: string;
}

/** The combined per-title payload stored in `cached_searches.results`. */
export interface JobsPayload {
  /** Normalized title the data was fetched for. */
  title: string;
  /**
   * Dominant Adzuna category among the top matching postings — the basis for
   * adjacent-title matching (PRD §8.3). Null when no postings matched.
   * Absent (undefined) on rows cached before this field existed.
   */
  category?: AdzunaCategory | null;
  /** Total live US postings matching the title. */
  totalCount: number;
  /** Adzuna's mean advertised salary across matching postings, if provided. */
  meanSalary: number | null;
  /** Posting counts restricted to the last 3 / 6 / 12 months (via max_days_old). */
  counts: {
    months3: number;
    months6: number;
    months12: number;
  };
  /**
   * Live postings grouped by listing age, oldest month first.
   * Each point is currently-open ads posted in that ~30-day window (the
   * difference of Adzuna `max_days_old` cumulatives). Adzuna's history
   * endpoint only returns salary, not vacancy counts, so this is the
   * monthly series we can actually plot. Absent on rows cached before
   * this field existed.
   */
  monthlyCounts?: { month: string; count: number }[];
  /**
   * Salary distribution: bucket lower bound (e.g. "60000") -> posting count.
   * Adzuna mixes advertised and estimated salaries here, so the UI labels
   * salary figures as estimated (FR6). Null if the endpoint failed.
   */
  salaryHistogram: Record<string, number> | null;
  /** Average advertised salary by month ("YYYY-MM" -> salary). Null if unavailable. */
  salaryHistoryByMonth: Record<string, number> | null;
  /** Posting counts aggregated by US state, sorted descending. */
  states: { state: string; count: number }[];
}

/** FR1: trim, collapse whitespace, lowercase, basic synonym handling. */
const TITLE_SYNONYMS: Record<string, string> = {
  swe: "software engineer",
  sde: "software developer",
  pm: "product manager",
  qa: "quality assurance",
  ux: "ux designer",
  hr: "human resources",
  devops: "devops engineer",
};

export function normalizeTitle(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return TITLE_SYNONYMS[cleaned] ?? cleaned;
}

class AdzunaError extends Error {
  constructor(path: string, status: number) {
    super(`Adzuna request failed: ${path} (HTTP ${status})`);
  }
}

async function adzunaFetch<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY are not configured");
  }

  const url = new URL(`${ADZUNA_BASE}/${path}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // Adzuna calls normally take 5-10s but can hang far longer on their side;
  // fail fast so the retry (or the user's own retry) isn't stuck behind a hang.
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new AdzunaError(path, res.status);
  return (await res.json()) as T;
}

/** Adzuna occasionally 5xxes transiently; retry each call once. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fn();
  }
}

/** Optional extras (geodata, salary, monthly windows) degrade instead of failing the search. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error("[adzuna] optional call failed:", error);
    return null;
  }
}

interface AdzunaAd {
  category?: { tag?: string; label?: string };
}

interface SearchResponse {
  count: number;
  mean?: number;
  results?: AdzunaAd[];
}

interface HistogramResponse {
  histogram?: Record<string, number>;
}

interface HistoryResponse {
  month?: Record<string, number>;
}

interface GeodataResponse {
  locations?: {
    count: number;
    location: { area: string[]; display_name: string };
  }[];
}

function searchCount(title: string, maxDaysOld?: number) {
  const params: Record<string, string> = {
    what: title,
    results_per_page: "1",
  };
  if (maxDaysOld !== undefined) params.max_days_old = String(maxDaysOld);
  return withRetry(() => adzunaFetch<SearchResponse>("search/1", params));
}

/**
 * Total-count search that also returns 50 postings, used to derive the
 * dominant category.
 */
function searchWithResults(title: string) {
  return withRetry(() =>
    adzunaFetch<SearchResponse>("search/1", {
      what: title,
      results_per_page: "50",
    })
  );
}

/** Most frequent category among the sampled postings, or null if none. */
function modalCategory(response: SearchResponse): AdzunaCategory | null {
  const tally = new Map<string, { category: AdzunaCategory; hits: number }>();
  for (const result of response.results ?? []) {
    const { tag, label } = result.category ?? {};
    if (!tag || !label) continue;
    const entry = tally.get(tag) ?? { category: { tag, label }, hits: 0 };
    entry.hits += 1;
    tally.set(tag, entry);
  }
  let best: { category: AdzunaCategory; hits: number } | null = null;
  for (const entry of tally.values()) {
    if (!best || entry.hits > best.hits) best = entry;
  }
  return best?.category ?? null;
}

/** One-call category lookup for a title (used when nothing is cached yet). */
export async function fetchTitleCategory(
  title: string
): Promise<AdzunaCategory | null> {
  return modalCategory(await searchWithResults(title));
}

/** One-call US-wide posting count for a title (used for adjacent titles). */
export async function fetchPostingCount(title: string): Promise<number> {
  return (await searchCount(title)).count;
}

/** Rolling ~30-day windows used to reconstruct a 12-month posting series. */
const MONTH_WINDOWS_DAYS = [
  30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365,
] as const;

function monthLabel(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return date.toLocaleString("en-US", { month: "short" });
}

/**
 * Split cumulative `max_days_old` counts into per-month live-posting buckets,
 * oldest month first so the chart reads left-to-right through time.
 */
function monthlyFromCumulative(
  cumulatives: number[]
): { month: string; count: number }[] {
  const points: { month: string; count: number }[] = [];
  for (let i = cumulatives.length - 1; i >= 0; i--) {
    const younger = i === 0 ? 0 : cumulatives[i - 1];
    points.push({
      month: monthLabel(i),
      count: Math.max(0, cumulatives[i] - younger),
    });
  }
  return points;
}

/**
 * Failed Adzuna windows arrive as null. Treating them as 0 makes
 * monthly diffs dump an entire cumulative into one month. Interpolate
 * gaps, then enforce non-decreasing cumulatives (30d ≤ 60d ≤ … ≤ 365d).
 */
function repairCumulatives(raw: (number | null)[]): number[] {
  const values: (number | null)[] = [...raw];
  const known: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) known.push(i);
  }

  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) continue;
    let prev: number | undefined;
    let next: number | undefined;
    for (const index of known) {
      if (index < i) prev = index;
      if (index > i && next === undefined) next = index;
    }
    if (prev !== undefined && next !== undefined) {
      const t = (i - prev) / (next - prev);
      values[i] = Math.round(
        values[prev]! + t * (values[next]! - values[prev]!)
      );
    } else if (prev !== undefined) {
      values[i] = values[prev]!;
    } else if (next !== undefined) {
      values[i] = values[next]!;
    } else {
      values[i] = 0;
    }
  }

  const repaired = values as number[];
  for (let i = 1; i < repaired.length; i++) {
    if (repaired[i] < repaired[i - 1]) repaired[i] = repaired[i - 1];
  }
  return repaired;
}

/** True when differenced months don't add back up to the 12-month cumulative. */
export function trendSeriesIsBroken(
  payload: Pick<JobsPayload, "counts" | "monthlyCounts">
): boolean {
  const monthly = payload.monthlyCounts;
  if (!monthly || monthly.length === 0) return true;
  const months12 = payload.counts.months12;
  if (months12 <= 0) return false;
  const sum = monthly.reduce((total, point) => total + point.count, 0);
  return Math.abs(sum - months12) > Math.max(10, months12 * 0.05);
}

/**
 * Fetches everything the dashboard needs for one title.
 * Makes 16 Adzuna calls in parallel (12 monthly count windows + total,
 * geodata, histogram, history). The 24h cache (FR2) keeps this within
 * the ~1,000 calls/month free tier.
 */
export async function fetchJobsData(title: string): Promise<JobsPayload> {
  const [total, geodata, histogram, history, ...monthResults] =
    await Promise.all([
      searchWithResults(title),
      orNull(
        withRetry(() => adzunaFetch<GeodataResponse>("geodata", { what: title }))
      ),
      orNull(
        withRetry(() =>
          adzunaFetch<HistogramResponse>("histogram", { what: title })
        )
      ),
      orNull(
        withRetry(() =>
          adzunaFetch<HistoryResponse>("history", {
            months: "12",
            what: title,
          })
        )
      ),
      ...MONTH_WINDOWS_DAYS.map((days) => orNull(searchCount(title, days))),
    ]);

  const states = (geodata?.locations ?? [])
    // area is ["US", "<state>"]; skip any entry without a state component
    .filter((entry) => entry.location.area.length >= 2)
    .map((entry) => ({ state: entry.location.area[1], count: entry.count }))
    .sort((a, b) => b.count - a.count);

  const rawCumulatives = monthResults.map((result) => result?.count ?? null);
  const cumulatives = repairCumulatives(rawCumulatives);
  const monthlyCounts = monthlyFromCumulative(cumulatives);
  const counts = {
    months3: cumulatives[2] ?? 0,
    months6: cumulatives[5] ?? 0,
    months12: cumulatives[11] ?? 0,
  };

  return {
    title,
    category: modalCategory(total),
    totalCount: total.count,
    meanSalary: total.mean ?? null,
    counts,
    monthlyCounts,
    salaryHistogram: histogram?.histogram ?? null,
    salaryHistoryByMonth: history?.month ?? null,
    states,
  };
}
