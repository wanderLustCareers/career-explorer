"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import JobsMap, { MapSkeleton } from "@/components/JobsMap";
import type { JobsPayload } from "@/lib/adzuna";

type JobsResponse = JobsPayload & { fetchedAt: string; cached: boolean };

const FRIENDLY_ERROR = "Job data is temporarily unavailable. Try again shortly.";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(title: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?title=${encodeURIComponent(title)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : FRIENDLY_ERROR);
        return;
      }
      console.log("[career-explorer] /api/jobs response:", json);
      setData(json as JobsResponse);
    } catch (err) {
      console.error("[career-explorer] /api/jobs request failed:", err);
      setError(FRIENDLY_ERROR);
    } finally {
      setLoading(false);
    }
  }

  const searched = loading || data !== null || error !== null;

  // Pre-search state (PRD §13.2, first wireframe): centered, minimal.
  if (!searched) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <h1 className="font-display text-5xl text-ink">Career Explorer</h1>
        <div className="w-full max-w-xl">
          <SearchForm onSearch={search} busy={loading} />
        </div>
      </main>
    );
  }

  // Post-search state (PRD §13.2, second wireframe): search docks to the
  // top; the map is the dominant, full-width element beneath it.
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-teal-tint">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
          <span className="font-display text-xl text-ink">Career Explorer</span>
          <div className="max-w-xl flex-1">
            <SearchForm onSearch={search} busy={loading} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {loading ? (
          <MapSkeleton />
        ) : error ? (
          <p className="py-16 text-center text-slate">{error}</p>
        ) : data && data.states.length === 0 ? (
          <p className="py-16 text-center text-slate">
            No postings found for this title — try a broader term.
          </p>
        ) : data ? (
          <JobsMap
            states={data.states}
            animationKey={`${data.title}:${data.fetchedAt}`}
          />
        ) : null}
      </div>
    </main>
  );
}
