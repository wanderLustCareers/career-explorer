"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { JobsPayload } from "@/lib/adzuna";

const TEAL = "#2F5D50";
const SLATE = "#5B6B63";
const TINT = "#EAF1EE";

const TICK = {
  fill: SLATE,
  fontSize: 12,
  fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
};

const WINDOWS = [3, 6, 12] as const;
type WindowMonths = (typeof WINDOWS)[number];

interface TrendChartProps {
  counts: JobsPayload["counts"];
  monthlyCounts?: JobsPayload["monthlyCounts"];
}

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || payload?.[0] === undefined) return null;
  return (
    <div className="rounded-lg border border-teal-tint bg-white px-3 py-2 text-sm">
      <span className="text-slate">{label}</span>{" "}
      <span className="font-mono font-medium text-teal">
        {formatCount(payload[0].value)}
      </span>
      <span className="text-slate"> postings</span>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[240px] flex-col rounded-xl border border-teal-tint bg-white p-5"
    >
      <div className="h-5 w-36 animate-pulse rounded bg-teal-tint" />
      <div className="mt-6 flex flex-1 items-end gap-3 px-4 pb-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded bg-teal-tint"
            style={{ height: `${40 + ((i * 17) % 70)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TrendChart({ counts, monthlyCounts }: TrendChartProps) {
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(12);
  const hasMonthly = (monthlyCounts?.length ?? 0) > 0;

  const data = hasMonthly
    ? monthlyCounts!.slice(-windowMonths)
    : [
        { month: "3 months", count: counts.months3 },
        { month: "6 months", count: counts.months6 },
        { month: "12 months", count: counts.months12 },
      ];

  return (
    <section className="flex h-full min-h-[240px] flex-col rounded-xl border border-teal-tint bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">Posting trend</h2>
          <p className="mt-1 text-sm text-slate">
            {hasMonthly
              ? "Live postings by month listed"
              : "Live postings in each window"}
          </p>
        </div>
        {hasMonthly && (
          <div className="flex rounded-lg border border-teal-tint p-0.5">
            {WINDOWS.map((months) => {
              const selected = months === windowMonths;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => setWindowMonths(months)}
                  aria-pressed={selected}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                    selected
                      ? "bg-teal-tint text-ink"
                      : "text-slate hover:text-ink"
                  }`}
                >
                  {months} mo
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            {/* PRD §13.3: faint horizontal baseline only — no grid chrome. */}
            <XAxis
              dataKey="month"
              tick={TICK}
              axisLine={{ stroke: TINT }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={TICK}
              axisLine={false}
              tickLine={false}
              width={48}
              allowDecimals={false}
              tickFormatter={formatCount}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  label={
                    props.label === undefined ? undefined : String(props.label)
                  }
                  payload={props.payload
                    ?.map((item) => ({ value: Number(item.value) }))
                    .filter((item) => Number.isFinite(item.value))}
                />
              )}
              cursor={{ stroke: TINT }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={TEAL}
              strokeWidth={2}
              isAnimationActive={false}
              dot={{ r: hasMonthly ? 3 : 4, fill: TEAL, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: TEAL, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
