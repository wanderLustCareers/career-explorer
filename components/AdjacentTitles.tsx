"use client";

import type { AdjacentTitle } from "@/lib/adjacent-titles";

interface AdjacentTitlesProps {
  titles: AdjacentTitle[];
  onSelect: (title: string) => void;
}

export function displayTitle(title: string) {
  return title.replace(/\b([a-z])/g, (char) => char.toUpperCase());
}

export function AdjacentSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="h-5 w-40 animate-pulse rounded bg-teal-tint" />
      <div className="mt-3 flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-24 min-w-[200px] flex-1 animate-pulse rounded-xl border border-teal-tint bg-teal-tint"
          />
        ))}
      </div>
    </section>
  );
}

export default function AdjacentTitles({
  titles,
  onSelect,
}: AdjacentTitlesProps) {
  const topTitle = titles[0]?.title;

  return (
    <section>
      <h2 className="font-display text-lg text-ink">Adjacent titles</h2>
      {titles.length === 0 ? (
        <p className="mt-3 text-sm text-slate">
          No adjacent titles to compare for this search.
        </p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {titles.map((item) => {
            const isTop = item.title === topTitle;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onSelect(item.title)}
                className={`min-w-[200px] shrink-0 rounded-xl border bg-white px-4 py-3 text-left outline-none transition-colors hover:bg-teal-tint focus-visible:ring-2 focus-visible:ring-teal ${
                  isTop ? "border-amber" : "border-teal-tint"
                }`}
              >
                <p className="text-sm font-medium text-ink">
                  {displayTitle(item.title)}
                </p>
                <p className="mt-2 text-sm text-slate">
                  <span className="font-mono font-medium text-ink">
                    {item.count.toLocaleString("en-US")}
                  </span>{" "}
                  postings
                </p>
                {isTop && (
                  <p className="mt-1 text-xs text-amber">Highest volume</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
