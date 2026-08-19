"use client";

import { useEffect, useRef, useState } from "react";
import SearchForm from "@/components/SearchForm";
import SignOutButton from "@/components/SignOutButton";
import JobsMap, { MapSkeleton } from "@/components/JobsMap";
import TrendChart, { ChartSkeleton } from "@/components/TrendChart";
import SalarySnapshot, { SalarySkeleton } from "@/components/SalarySnapshot";
import AdjacentTitles, {
  AdjacentSkeleton,
  displayTitle,
} from "@/components/AdjacentTitles";
import type { AdjacentTitle } from "@/lib/adjacent-titles";
import type { JobsPayload } from "@/lib/adzuna";
import { normalizeTitle } from "@/lib/adzuna";

type JobsResponse = JobsPayload & { fetchedAt: string; cached: boolean };

const FRIENDLY_ERROR =
  "Job data is temporarily unavailable. Try again shortly.";

const MAX_RECENT = 8;
const RECENT_KEY = "career-explorer:recent-searches";

function broaderTerm(title: string): string | null {
  const parts = title.trim().split(/\s+/);
  return parts.length >= 2 ? parts.slice(1).join(" ") : null;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <MapSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <SalarySkeleton />
      </div>
      <AdjacentSkeleton />
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjacent, setAdjacent] = useState<AdjacentTitle[] | null>(null);
  const [adjacentLoading, setAdjacentLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const requestId = useRef(0);
  const lastTitle = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        setRecent(parsed);
      }
    } catch {
      // Ignore a corrupt session entry; start with an empty list.
    }
  }, []);

  function persistRecent(next: string[]) {
    try {
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Private mode can block sessionStorage; in-memory list still works.
    }
  }

  function rememberSearch(title: string) {
    const key = normalizeTitle(title);
    setRecent((prev) => {
      const next = [key, ...prev.filter((item) => item !== key)].slice(
        0,
        MAX_RECENT
      );
      persistRecent(next);
      return next;
    });
  }

  function forgetSearch(title: string) {
    const key = normalizeTitle(title);
    setRecent((prev) => {
      const next = prev.filter((item) => item !== key);
      persistRecent(next);
      return next;
    });
  }

  async function search(title: string) {
    const query = title.trim();
    if (!query) return;

    const id = ++requestId.current;
    lastTitle.current = query;
    setInput(query);
    rememberSearch(query);
    setLoading(true);
    setError(null);
    setAdjacent(null);
    setAdjacentLoading(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const jobsReq = fetch(`/api/jobs?title=${encodeURIComponent(query)}`, {
      signal: ac.signal,
    });
    const adjReq = fetch(
      `/api/adjacent-titles?title=${encodeURIComponent(query)}`,
      { signal: ac.signal }
    );

    try {
      const res = await jobsReq;
      const json = await res.json();
      if (id !== requestId.current) return;
      if (!res.ok) {
        setData(null);
        setError(typeof json.error === "string" ? json.error : FRIENDLY_ERROR);
      } else {
        setData(json as JobsResponse);
      }
    } catch (err) {
      console.error("[career-explorer] /api/jobs request failed:", err);
      if (
        (err instanceof Error && err.name === "AbortError") ||
        id !== requestId.current
      ) {
        return;
      }
      setData(null);
      setError(FRIENDLY_ERROR);
    } finally {
      if (id === requestId.current) setLoading(false);
    }

    try {
      const res = await adjReq;
      const json = await res.json();
      if (id !== requestId.current) return;
      setAdjacent(
        res.ok && Array.isArray(json.adjacentTitles) ? json.adjacentTitles : []
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[career-explorer] /api/adjacent-titles request failed:", err);
      if (id !== requestId.current) return;
      setAdjacent([]);
    } finally {
      if (id === requestId.current) setAdjacentLoading(false);
    }
  }

  function goHome() {
    abortRef.current?.abort();
    requestId.current += 1;
    setInput("");
    setLoading(false);
    setData(null);
    setError(null);
    setAdjacent(null);
    setAdjacentLoading(false);
  }

  const searched = loading || data !== null || error !== null;
  const noResults = data !== null && data.totalCount === 0;
  const suggestion = adjacent?.[0]?.title ?? broaderTerm(lastTitle.current);

  const searchForm = (
    <SearchForm
      value={input}
      onChange={setInput}
      onSearch={search}
      busy={loading}
      recent={recent}
      onRemoveRecent={forgetSearch}
    />
  );

  // Pre-search state (PRD §13.2, first wireframe): centered, minimal.
  if (!searched) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="absolute right-6 top-4">
          <SignOutButton />
        </div>
        <h1 className="font-display text-5xl text-ink">Career Explorer</h1>
        <div className="w-full max-w-xl">{searchForm}</div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-teal-tint">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
          <button
            type="button"
            onClick={goHome}
            className="font-display text-xl text-ink outline-none hover:text-teal focus-visible:ring-2 focus-visible:ring-teal"
          >
            Career Explorer
          </button>
          <div className="max-w-xl flex-1">{searchForm}</div>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-ink">{error}</p>
            <button
              type="button"
              onClick={() => search(lastTitle.current)}
              className="mt-4 rounded-xl border border-teal-tint bg-white px-4 py-2 text-sm text-teal outline-none hover:bg-teal-tint focus-visible:ring-2 focus-visible:ring-teal"
            >
              Try again
            </button>
          </div>
        ) : noResults ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-ink">
              No postings found for this title — try a broader term.
            </p>
            {adjacentLoading ? (
              <div className="mt-4 h-9 w-48 animate-pulse rounded-xl bg-teal-tint" />
            ) : suggestion ? (
              <button
                type="button"
                onClick={() => search(suggestion)}
                className="mt-4 rounded-xl border border-teal-tint bg-white px-4 py-2 text-sm text-teal outline-none hover:bg-teal-tint focus-visible:ring-2 focus-visible:ring-teal"
              >
                Try {displayTitle(suggestion)}
              </button>
            ) : null}
          </div>
        ) : data ? (
          <div
            key={`${data.title}:${data.fetchedAt}`}
            className="flex animate-rise flex-col gap-6"
          >
            <JobsMap
              states={data.states}
              animationKey={`${data.title}:${data.fetchedAt}`}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TrendChart
                counts={data.counts}
                monthlyCounts={data.monthlyCounts}
              />
              <SalarySnapshot
                historyByMonth={data.salaryHistoryByMonth}
                meanSalary={data.meanSalary}
              />
            </div>
            {adjacentLoading || adjacent === null ? (
              <AdjacentSkeleton />
            ) : (
              <AdjacentTitles titles={adjacent} onSelect={search} />
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
