"use client";

import React from "react";

/**
 * Legend component with hover explanations.
 * Colors stay the same; labels updated to:
 *  - Complete (green)
 *  - Needs Attention (yellow)
 *  - Overdue (red)
 *  - Other/NA (neutral)
 *
 * Pass your timing thresholds if you want to surface the exact numbers used elsewhere.
 * If you omit `timing`, sensible defaults are shown in the tooltips but
 * they do NOT change your underlying logic elsewhere.
 */
export default function Legend({
  timing = {
    touchPoint: { warnDays: 14, overdueDays: 28, idealEveryDays: 14 },
    lqr: { warnDays: 75, overdueDays: 90, idealEveryDays: 90 }, // "same timing" can be applied by setting these to your current values
    notes: "Timing here mirrors your existing logic. Adjust numbers to match your current thresholds."
  }
}) {
  const items = [
    {
      label: "Complete",
      colorClass: "bg-green-500",
      borderClass: "ring-green-500/20",
      tooltip: [
        "• Monthly targets met for the period.",
        `• Touch Point is within ${timing.touchPoint.idealEveryDays} days.`,
        `• LQR (quarterly review) is within ${timing.lqr.idealEveryDays} days.`
      ]
    },
    {
      label: "Needs Attention",
      colorClass: "bg-yellow-500",
      borderClass: "ring-yellow-500/20",
      tooltip: [
        `• Touch Point is > ${timing.touchPoint.idealEveryDays} days but < ${timing.touchPoint.overdueDays} days.`,
        `• LQR is > ${timing.lqr.warnDays - (timing.lqr.overdueDays - timing.lqr.warnDays)} days but < ${timing.lqr.overdueDays} days (i.e., in the warning window).`,
        "• Monthly target is close to falling behind (within your warning window)."
      ]
    },
    {
      label: "Overdue",
      colorClass: "bg-red-500",
      borderClass: "ring-red-500/20",
      tooltip: [
        `• Touch Point older than ${timing.touchPoint.overdueDays} days.`,
        `• LQR older than ${timing.lqr.overdueDays} days.`,
        "• Monthly target missed for the period."
      ]
    },
    {
      label: "Other/NA",
      colorClass: "bg-slate-400",
      borderClass: "ring-slate-400/20",
      tooltip: [
        "• Not applicable for this month/client (e.g., client not yet onboarded, paused, seasonal).",
        "• We render these months with a single “–” dash."
      ]
    }
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="group relative inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 ring-2 ring-inset transition-colors"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}
        >
          <span className={`inline-block h-3 w-3 rounded ${it.colorClass}`} />
          <span className="text-sm font-medium">{it.label}</span>

          {/* Tooltip */}
          <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-[22rem] max-w-[85vw] rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-100 shadow-lg group-hover:block">
            <div className="mb-1 text-[.8rem] font-semibold opacity-80">{it.label}</div>
            <ul className="list-disc space-y-1 pl-5">
              {it.tooltip.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <div className="mt-2 text-[.72rem] opacity-60">{timing.notes}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
