"use client";

import React, { useMemo, useState } from "react";

type VarianceLevel = "balanced" | "medium" | "high";
type Theme = "dark" | "light";

interface CreativeRow {
  index: number;
  name: string;
  impressions: number;
  clicks: number;
  installs: number;
  primaryEvents: number;
  secondaryEvents: number;
}

function generateWeights(count: number, variance: VarianceLevel): number[] {
  if (count <= 0) return [];

  let factor: number;
  switch (variance) {
    case "balanced":
      factor = 0.2;
      break;
    case "medium":
      factor = 1.0;
      break;
    case "high":
      factor = 3.0;
      break;
  }

  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    const w = 1 + Math.random() * factor;
    weights.push(w);
  }

  const sum = weights.reduce((acc, v) => acc + v, 0);
  return weights.map((w) => w / sum);
}

function distribute(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) {
    return Array(weights.length).fill(0);
  }

  const result = new Array(weights.length).fill(0);
  let remaining = total;

  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      result[i] = remaining;
    } else {
      const raw = total * weights[i];
      const value = Math.round(raw);
      result[i] = value;
      remaining -= value;
    }
  }

  return result;
}

const Page: React.FC = () => {
  // THEME
  const [theme, setTheme] = useState<Theme>("dark");
  const isDark = theme === "dark";

  // INPUT STATES (string, first load = empty)
  const [creativeCountInput, setCreativeCountInput] = useState<string>("");

  const [totalImpressionsInput, setTotalImpressionsInput] =
    useState<string>("");
  const [totalClicksInput, setTotalClicksInput] = useState<string>("");
  const [totalInstallsInput, setTotalInstallsInput] = useState<string>("");
  const [totalPrimaryEventsInput, setTotalPrimaryEventsInput] =
    useState<string>("");
  const [totalSecondaryEventsInput, setTotalSecondaryEventsInput] =
    useState<string>("");

  const [primaryEventLabel, setPrimaryEventLabel] =
    useState<string>("Paid Events");
  const [secondaryEventLabel, setSecondaryEventLabel] =
    useState<string>("Second Event");
  const [secondaryEventEnabled, setSecondaryEventEnabled] =
    useState<boolean>(false);

  const [variance, setVariance] = useState<VarianceLevel>("balanced");

  // Parsed numeric values (empty => 0)
  const creativeCount = useMemo(
    () => Math.max(0, Number(creativeCountInput) || 0),
    [creativeCountInput]
  );
  const totalImpressions = useMemo(
    () => Math.max(0, Number(totalImpressionsInput) || 0),
    [totalImpressionsInput]
  );
  const totalClicks = useMemo(
    () => Math.max(0, Number(totalClicksInput) || 0),
    [totalClicksInput]
  );
  const totalInstalls = useMemo(
    () => Math.max(0, Number(totalInstallsInput) || 0),
    [totalInstallsInput]
  );
  const totalPrimaryEvents = useMemo(
    () => Math.max(0, Number(totalPrimaryEventsInput) || 0),
    [totalPrimaryEventsInput]
  );
  const totalSecondaryEvents = useMemo(
    () => Math.max(0, Number(totalSecondaryEventsInput) || 0),
    [totalSecondaryEventsInput]
  );

  const creatives: CreativeRow[] = useMemo(() => {
    const n = Math.max(0, creativeCount);

    const weights = generateWeights(n, variance);

    const impressionsDist = distribute(totalImpressions, weights);
    const clicksDist = distribute(totalClicks, weights);
    const installsDist = distribute(totalInstalls, weights);
    const primaryEventsDist = distribute(totalPrimaryEvents, weights);
    const secondaryEventsDist = secondaryEventEnabled
      ? distribute(totalSecondaryEvents, weights)
      : Array(n).fill(0);

    return Array.from({ length: n }, (_, i) => ({
      index: i + 1,
      name: `Creative ${i + 1}`,
      impressions: impressionsDist[i] ?? 0,
      clicks: clicksDist[i] ?? 0,
      installs: installsDist[i] ?? 0,
      primaryEvents: primaryEventsDist[i] ?? 0,
      secondaryEvents: secondaryEventsDist[i] ?? 0,
    }));
  }, [
    creativeCount,
    totalImpressions,
    totalClicks,
    totalInstalls,
    totalPrimaryEvents,
    totalSecondaryEvents,
    variance,
    secondaryEventEnabled,
  ]);

  const exportCsv = () => {
    if (!creatives.length) return;

    const headers = [
      "Creative",
      "Impressions",
      "Clicks",
      "Installs",
      primaryEventLabel,
      secondaryEventEnabled ? secondaryEventLabel : undefined,
    ].filter(Boolean) as string[];

    const lines: string[] = [];
    lines.push(headers.join(","));

    for (const row of creatives) {
      const cols: (string | number)[] = [
        row.name,
        row.impressions,
        row.clicks,
        row.installs,
        row.primaryEvents,
      ];
      if (secondaryEventEnabled) {
        cols.push(row.secondaryEvents);
      }
      lines.push(
        cols
          .map((v) => {
            const s = String(v);
            if (s.includes(",") || s.includes('"') || s.includes("\n")) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          })
          .join(",")
      );
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creative_distribution.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageBg = isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900";
  const cardBg = isDark
    ? "bg-slate-900/60 border border-slate-800"
    : "bg-white border border-slate-200 shadow-sm";
  const subtleText = isDark ? "text-slate-300" : "text-slate-600";
  const inputBg =
    "w-full rounded-md border px-2 py-1 text-xs " +
    (isDark
      ? "bg-slate-950 border-slate-700"
      : "bg-white border-slate-300");

  const buttonVariant = (active: boolean) =>
    `px-3 py-1 rounded-md border text-xs ${
      active
        ? "bg-emerald-500 text-slate-950 border-emerald-400"
        : isDark
        ? "bg-slate-900 border-slate-700"
        : "bg-slate-100 border-slate-300"
    }`;

  return (
    <div
      className={`min-h-screen ${pageBg} px-4 py-8 flex justify-center transition-colors`}
    >
      <div className="w-full max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">
              Creative Report Distribution Helper
            </h1>
            <p className={`text-sm max-w-2xl ${subtleText}`}>
              Enter your total numbers (impressions, clicks, installs, events)
              and let the tool distribute them across creatives with different
              variance options.
            </p>
          </div>
          <button
            onClick={() =>
              setTheme((prev) => (prev === "dark" ? "light" : "dark"))
            }
            className="text-xs px-3 py-1.5 rounded-md border border-slate-500/60 bg-slate-900/20 hover:bg-slate-900/40 transition-colors"
          >
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </button>
        </header>

        {/* Inputs */}
        <section className={`${cardBg} rounded-xl p-4 space-y-4`}>
          <h2 className="font-medium text-lg">Input parameters</h2>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className={`block text-xs mb-1 ${subtleText}`}>
                Number of creatives
              </label>
              <input
                type="number"
                min={1}
                value={creativeCountInput}
                onChange={(e) => setCreativeCountInput(e.target.value)}
                className={inputBg}
                placeholder="e.g. 10"
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${subtleText}`}>
                Total impressions
              </label>
              <input
                type="number"
                min={0}
                value={totalImpressionsInput}
                onChange={(e) => setTotalImpressionsInput(e.target.value)}
                className={inputBg}
                placeholder="e.g. 100000"
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${subtleText}`}>
                Total clicks
              </label>
              <input
                type="number"
                min={0}
                value={totalClicksInput}
                onChange={(e) => setTotalClicksInput(e.target.value)}
                className={inputBg}
                placeholder="e.g. 5000"
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${subtleText}`}>
                Total installs
              </label>
              <input
                type="number"
                min={0}
                value={totalInstallsInput}
                onChange={(e) => setTotalInstallsInput(e.target.value)}
                className={inputBg}
                placeholder="e.g. 2000"
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${subtleText}`}>
                Primary event label
              </label>
              <input
                type="text"
                value={primaryEventLabel}
                onChange={(e) => setPrimaryEventLabel(e.target.value)}
                className={inputBg}
                placeholder="Paid Events"
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${subtleText}`}>
                Total primary events
              </label>
              <input
                type="number"
                min={0}
                value={totalPrimaryEventsInput}
                onChange={(e) => setTotalPrimaryEventsInput(e.target.value)}
                className={inputBg}
                placeholder="e.g. 300"
              />
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4 space-y-3 text-sm">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={secondaryEventEnabled}
                onChange={(e) => setSecondaryEventEnabled(e.target.checked)}
              />
              <span className={subtleText}>Enable second event type</span>
            </label>

            {secondaryEventEnabled && (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className={`block text-xs mb-1 ${subtleText}`}>
                    Second event label
                  </label>
                  <input
                    type="text"
                    value={secondaryEventLabel}
                    onChange={(e) => setSecondaryEventLabel(e.target.value)}
                    className={inputBg}
                    placeholder="Second Event"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${subtleText}`}>
                    Total second events
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={totalSecondaryEventsInput}
                    onChange={(e) =>
                      setTotalSecondaryEventsInput(e.target.value)
                    }
                    className={inputBg}
                    placeholder="e.g. 150"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/60 pt-4 flex flex-wrap gap-4 items-center text-sm">
            <div>
              <p className={`text-xs mb-1 ${subtleText}`}>
                Distribution style (how different creatives are from each
                other)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setVariance("balanced")}
                  className={buttonVariant(variance === "balanced")}
                >
                  Balanced
                </button>
                <button
                  onClick={() => setVariance("medium")}
                  className={buttonVariant(variance === "medium")}
                >
                  Medium variance
                </button>
                <button
                  onClick={() => setVariance("high")}
                  className={buttonVariant(variance === "high")}
                >
                  Very skewed
                </button>
              </div>
            </div>

            <button
              onClick={exportCsv}
              disabled={!creatives.length}
              className={`ml-auto px-3 py-1.5 rounded-md text-xs border ${
                isDark
                  ? "bg-slate-800 border-slate-600"
                  : "bg-slate-100 border-slate-300"
              } disabled:opacity-50`}
            >
              Export CSV
            </button>
          </div>
        </section>

        {/* Results table */}
        <section className={`${cardBg} rounded-xl p-4 text-sm`}>
          <h2 className="font-medium mb-2">Distributed per creative</h2>
          {!creatives.length ? (
            <p className={`text-xs ${subtleText}`}>
              Set number of creatives & totals above to see the distribution.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800/60 text-left">
                    <th className="py-1 pr-2">Creative</th>
                    <th className="py-1 pr-2">Impressions</th>
                    <th className="py-1 pr-2">Clicks</th>
                    <th className="py-1 pr-2">Installs</th>
                    <th className="py-1 pr-2">{primaryEventLabel}</th>
                    {secondaryEventEnabled && (
                      <th className="py-1 pr-2">{secondaryEventLabel}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {creatives.map((row) => (
                    <tr
                      key={row.index}
                      className={`border-b border-slate-900/40 ${
                        isDark ? "even:bg-slate-900/40" : "even:bg-slate-100/60"
                      }`}
                    >
                      <td className="py-1 pr-2">{row.name}</td>
                      <td className="py-1 pr-2">{row.impressions}</td>
                      <td className="py-1 pr-2">{row.clicks}</td>
                      <td className="py-1 pr-2">{row.installs}</td>
                      <td className="py-1 pr-2">{row.primaryEvents}</td>
                      {secondaryEventEnabled && (
                        <td className="py-1 pr-2">{row.secondaryEvents}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Page;
