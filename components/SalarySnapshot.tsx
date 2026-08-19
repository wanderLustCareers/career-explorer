"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TEAL = "#2F5D50";
const SLATE = "#5B6B63";
const TINT = "#EAF1EE";

const TICK = {
  fill: SLATE,
  fontSize: 12,
  fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
};

interface SalarySnapshotProps {
  historyByMonth: Record<string, number> | null;
  meanSalary: number | null;
}

function formatSalary(n: number) {
  if (n >= 1000) return `$${Math.round(n / 1000).toLocaleString("en-US")}k`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function monthLabel(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  if (!year || !month) return ym;
  return new Date(year, month - 1).toLocaleString("en-US", { month: "short" });
}

function toSeries(history: Record<string, number>) {
  return Object.entries(history)
    .filter(([, salary]) => Number.isFinite(salary))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, salary]) => ({ month: monthLabel(ym), salary }));
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
        {formatSalary(payload[0].value)}
      </span>
    </div>
  );
}

export function SalarySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[240px] flex-col rounded-xl border border-teal-tint bg-white p-5"
    >
      <div className="h-5 w-40 animate-pulse rounded bg-teal-tint" />
      <div className="mt-6 flex flex-1 items-end gap-3 px-4 pb-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded bg-teal-tint"
            style={{ height: `${50 + ((i * 13) % 40)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SalarySnapshot({
  historyByMonth,
  meanSalary,
}: SalarySnapshotProps) {
  const data = historyByMonth ? toSeries(historyByMonth) : [];
  const salaries = data.map((point) => point.salary);
  const min = salaries.length ? Math.min(...salaries) : 0;
  const max = salaries.length ? Math.max(...salaries) : 0;
  const pad = Math.max((max - min) * 0.2, 2000);

  return (
    <section className="flex h-full min-h-[240px] flex-col rounded-xl border border-teal-tint bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">Salary snapshot</h2>
          <p className="mt-1 text-sm text-slate">
            Average advertised salary by month
          </p>
        </div>
        {meanSalary !== null && (
          <div className="text-right">
            <p className="font-mono text-2xl font-medium text-ink">
              {formatSalary(meanSalary)}
            </p>
            <p className="mt-0.5 text-xs text-slate">Typical posted</p>
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
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
                domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
                tickFormatter={formatSalary}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    label={
                      props.label === undefined
                        ? undefined
                        : String(props.label)
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
                dataKey="salary"
                stroke={TEAL}
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ r: 3, fill: TEAL, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: TEAL, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : meanSalary !== null ? (
        <p className="mt-8 text-sm text-slate">No monthly history for this title.</p>
      ) : (
        <p className="mt-8 text-slate">
          Salary data isn&apos;t available for this title.
        </p>
      )}
    </section>
  );
}
