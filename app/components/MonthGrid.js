"use client";

import React, { useMemo } from "react";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * MonthGrid
 *
 * Renders the 12-month bar for a given year.
 * If a month does NOT exist for a client (e.g., they started later),
 * we show a grey pill with a centered "–" dash and mark it "Other/NA".
 *
 * Props:
 *  - monthsForYear: Array(12) where index=0 => Jan ... index=11 => Dec.
 *       Each entry may be:
 *         { state: "complete"|"needs_attention"|"overdue"|"other", note?: string }
 *       If entry is undefined/null AND month < clientStartIndex => render as "–" (Other/NA).
 *  - clientStartISO: ISO date string for onboarding; if absent we infer start by first non-empty month.
 *  - year: number (for data attributes only)
 */
export default function MonthGrid({ monthsForYear = [], clientStartISO = null, year = new Date().getFullYear() }) {
  // Determine first active month index if not provided explicitly
  const inferredStartIndex = useMemo(() => {
    if (clientStartISO) {
      const d = new Date(clientStartISO);
      if (!Number.isNaN(d.getTime())) return d.getMonth();
    }
    const idx = monthsForYear.findIndex((m) => !!m);
    return idx === -1 ? 0 : idx;
  }, [clientStartISO, monthsForYear]);

  function colorForState(state) {
    switch (state) {
      case "complete": return "bg-green-500 text-white";
      case "needs_attention": return "bg-yellow-500 text-black";
      case "overdue": return "bg-red-500 text-white";
      case "other":
      default: return "bg-slate-400 text-black";
    }
  }

  return (
    <div className="grid grid-cols-12 gap-2">
      {MONTHS_SHORT.map((label, i) => {
        const entry = monthsForYear[i] || null;
        const isBeforeStart = i < inferredStartIndex && !entry;
        const isNA = isBeforeStart;

        const state = isNA ? "other" : (entry?.state || "other");
        const note = isNA ? "Not applicable (client not with us yet this month)" : (entry?.note || "");

        const colorClass = colorForState(state);

        return (
          <div
            key={`${year}-${i}`}
            className={`relative flex h-10 items-center justify-center rounded-md text-xs font-semibold ${colorClass}`}
            title={note || label}
            data-year={year}
            data-month={i+1}
          >
            {isNA ? "–" : label}
            {/* Optional note popover on hover */}
            {note && !isNA && (
              <div className="pointer-events-none absolute left-0 top-full z-10 hidden w-64 rounded-md border border-white/10 bg-neutral-900 p-2 text-[.72rem] text-neutral-100 shadow-md hover:block group-hover:block md:group-hover:block">
                {note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
