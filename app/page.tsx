"use client";

import React, { useState } from "react";

type DistributionStyle = "balanced" | "moderate" | "high";

interface CreativeRow {
  id: number;
  impressions: number;
  installs: number;
  paidEvents: number;
}

// ---- helpers ----

function generateWeights(
  count: number,
  style: DistributionStyle
): number[] {
  if (count <= 0) return [];

  const raw: number[] = [];

  for (let i = 0; i < count; i++) {
    let w: number;

    if (style === "balanced") {
      // Around 1.0 with small noise
      const noise = (Math.random() - 0.5) * 0.2; // [-0.1, +0.1]
      w = 1 + noise;
    } else if (style === "moderate") {
      // Uniform between 0.5 and 1.5
      w = 0.5 + Math.random();
    } else {
      // "high" variance: exponential-like distribution
      // -log(U) gives lots of small values and a few big ones
      const u = Math.random();
      w = -Math.log(u + 1e-9);
    }

    if (w <= 0) w = 0.0001;
    raw.push(w);
  }

  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / sum);
}

function distributeIntegerTotal(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const rawValues = weights.map((w) => w * total);
  const floors = rawValues.map((v) => Math.floor(v));
  let assigned = floors.reduce((a, b) => a + b, 0);
  let remainder = total - assigned;

  // track fractional parts
  const frac = rawValues.map((v, idx) => ({
    idx,
    frac: v - floors[idx],
  }));

  // sort descending by fractional part
  frac.sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  let i = 0;
  while (remainder > 0 && i < frac.length) {
    result[frac[i].idx] += 1;
    remainder--;
    i++;
  }

  return result;
}

function toCSV(rows: CreativeRow[]): string {
  if (!rows.length) return "";
  const headers = ["creative_id", "impressions", "installs", "paid_events"];
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escape(r.id),
        escape(r.impressions),
        escape(r.installs),
        escape(r.paidEvents),
      ].join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCSV(filename: string, rows: CreativeRow[]) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- main page ----

const CreativeDistributorPage: React.FC = () => {
  const [creativeCount, setCreativeCount] = useState<number>(10);
  const [totalImpressions, setTotalImpressions] = useState<number>(100000);
  const [totalInstalls, setTotalInstalls] = useState<number>(2000);
  const [totalPaidEvents, setTotalPaidEvents] = useState<number>(300);
  const [style, setStyle] = useState<DistributionStyle>("balanced");

  const [rows, setRows] = useState<CreativeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);

    if (
      !Number.isFinite(creativeCount) ||
      creativeCount <= 0 ||
      !Number.isInteger(creativeCount)
    ) {
      setError("Number of creatives must be a positive integer.");
      return;
    }
    if (totalImpressions < 0 || totalInstalls < 0 || totalPaidEvents < 0) {
      setError("Totals cannot be negative.");
      return;
    }

    const weights = generateWeights(creativeCount, style);

    const impressionsDist = distributeIntegerTotal(totalImpressions, weights);
    const installsDist = distributeIntegerTotal(totalInstalls, weights);
    const eventsDist = distributeIntegerTotal(totalPaidEvents, weights);

    const generated: CreativeRow[] = [];
    for (let i = 0; i < creativeCount; i++) {
      generated.push({
        id: i + 1,
        impressions: impressionsDist[i],
        installs: installsDist[i],
        paidEvents: eventsDist[i],
      });
    }

    setRows(generated);
  };

  const totalsCheck = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.installs += r.installs;
      acc.paidEvents += r.paidEvents;
      return acc;
    },
    { impressions: 0, installs: 0, paidEvents: 0 }
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center px-4 py-8">
      <div className="w-full max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">
            Creative Metrics Distributor
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Generate synthetic per–creative metrics given total impressions,
            installs, and paid events. Choose how evenly the numbers should
            be spread across creatives.
          </p>
        </header>

        {/* Inputs */}
        <section className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-4 text-sm">
          <h2 className="font-medium text-lg">Input parameters</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Number of creatives
              </label>
              <input
                type="number"
                min={1}
                value={creativeCount}
                onChange={(e) =>
                  setCreativeCount(Number(e.target.value) || 0)
                }
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Total impressions
              </label>
              <input
                type="number"
                min={0}
                value={totalImpressions}
                onChange={(e) =>
                  setTotalImpressions(Number(e.target.value) || 0)
                }
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Total installs
              </label>
              <input
                type="number"
                min={0}
                value={totalInstalls}
                onChange={(e) =>
                  setTotalInstalls(Number(e.target.value) || 0)
                }
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Total paid events
              </label>
              <input
                type="number"
                min={0}
                value={totalPaidEvents}
                onChange={(e) =>
                  setTotalPaidEvents(Number(e.target.value) || 0)
                }
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Distribution style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as DistributionStyle)}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
              >
                <option value="balanced">
                  Balanced (almost equal)
                </option>
                <option value="moderate">
                  Moderate variance
                </option>
                <option value="high">
                  High variance (few big winners)
                </option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                This controls how close or far apart the creatives are from
                each other.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-xs font-semibold"
          >
            Generate distribution
          </button>
        </section>

        {/* Results */}
        {rows.length > 0 && (
          <section className="space-y-3 text-sm bg-slate-900/60 rounded-xl border border-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-medium text-lg">Results</h2>
                <p className="text-xs text-slate-300">
                  Totals check — impressions: {totalsCheck.impressions} /
                  {totalImpressions}, installs: {totalsCheck.installs} /
                  {totalInstalls}, paid events: {totalsCheck.paidEvents} /
                  {totalPaidEvents}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-800 text-slate-100 text-xs"
                >
                  Regenerate (same settings)
                </button>
                <button
                  onClick={() => downloadCSV("creative_distribution.csv", rows)}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-800 text-slate-100 text-xs"
                >
                  Download CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="py-1 pr-2">Creative ID</th>
                    <th className="py-1 pr-2">Impressions</th>
                    <th className="py-1 pr-2">Installs</th>
                    <th className="py-1 pr-2">Paid events</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-900">
                      <td className="py-1 pr-2">{r.id}</td>
                      <td className="py-1 pr-2">{r.impressions}</td>
                      <td className="py-1 pr-2">{r.installs}</td>
                      <td className="py-1 pr-2">{r.paidEvents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CreativeDistributorPage;
