/**
 * Server-only Adzuna client. Uses ADZUNA_APP_ID / ADZUNA_APP_KEY, which must
 * never be exposed to the browser — this module is only imported from API
 * route handlers.
 */

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/us";

/** The combined per-title payload stored in `cached_searches.results`. */
export interface JobsPayload {
  /** Normalized title the data was fetched for. */
  title: string;
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

/** Optional data (salary extras) degrades to null instead of failing the search. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error("[adzuna] optional call failed:", error);
    return null;
  }
}

interface SearchResponse {
  count: number;
  mean?: number;
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
 * Fetches everything the dashboard needs for one title.
 * Makes 7 Adzuna calls in parallel — the 24h cache (FR2) keeps this within
 * the ~1,000 calls/month free tier.
 */
export async function fetchJobsData(title: string): Promise<JobsPayload> {
  const [total, last3, last6, last12, geodata, histogram, history] =
    await Promise.all([
      searchCount(title),
      searchCount(title, 90),
      searchCount(title, 180),
      searchCount(title, 365),
      withRetry(() => adzunaFetch<GeodataResponse>("geodata", { what: title })),
      orNull(
        withRetry(() =>
          adzunaFetch<HistogramResponse>("histogram", { what: title })
        )
      ),
      orNull(
        withRetry(() =>
          adzunaFetch<HistoryResponse>("history", {
            what: title,
            months: "12",
          })
        )
      ),
    ]);

  const states = (geodata.locations ?? [])
    // area is ["US", "<state>"]; skip any entry without a state component
    .filter((entry) => entry.location.area.length >= 2)
    .map((entry) => ({ state: entry.location.area[1], count: entry.count }))
    .sort((a, b) => b.count - a.count);

  return {
    title,
    totalCount: total.count,
    meanSalary: total.mean ?? null,
    counts: {
      months3: last3.count,
      months6: last6.count,
      months12: last12.count,
    },
    salaryHistogram: histogram?.histogram ?? null,
    salaryHistoryByMonth: history?.month ?? null,
    states,
  };
}
