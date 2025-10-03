"use client";

import React, { useMemo, useState } from "react";

/**
 * EventsBoard
 *
 * Splits events into "Major Upcoming" and "Major Past" automatically.
 * Past events are any whose date is strictly before "today" in Australia/Brisbane time.
 * Both sections are collapsible.
 *
 * Props:
 *  - events: Array of { id, title, dateISO, category?: string, location?: string, note?: string }
 */
export default function EventsBoard({ events = [] }) {
  const nowBrisbane = useMemo(() => {
    // Queensland does not observe DST; safe to use +10:00
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const aedtOffsetMs = 10 * 60 * 60 * 1000; // +10:00
    return new Date(utc + aedtOffsetMs);
  }, []);

  const startOfTodayBrisbane = new Date(nowBrisbane.getFullYear(), nowBrisbane.getMonth(), nowBrisbane.getDate());

  function parseISO(d) {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x;
  }

  const { upcoming, past } = useMemo(() => {
    const up = [];
    const pa = [];
    for (const ev of events) {
      const d = parseISO(ev.dateISO);
      if (!d) continue;
      const isPast = d < startOfTodayBrisbane;
      (isPast ? pa : up).push(ev);
    }
    // Sort soonest-first for upcoming; most-recent-first for past
    up.sort((a,b) => new Date(a.dateISO) - new Date(b.dateISO));
    pa.sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
    return { upcoming: up, past: pa };
  }, [events, startOfTodayBrisbane]);

  const [openUpcoming, setOpenUpcoming] = useState(true);
  const [openPast, setOpenPast] = useState(false);

  const Section = ({ title, open, onToggle, items }) => (
    <div className="rounded-xl border border-white/10 bg-neutral-900/40">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs opacity-70">{open ? "Hide" : "Show"} ({items.length})</span>
      </button>
      {open && (
        <div className="divide-y divide-white/5">
          {items.length === 0 && (
            <div className="px-4 py-4 text-sm opacity-70">No items.</div>
          )}
          {items.map((ev) => (
            <div key={ev.id ?? `${ev.title}-${ev.dateISO}`} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
              <div className="col-span-12 md:col-span-3 font-medium">
                {formatDate(ev.dateISO)}
              </div>
              <div className="col-span-12 md:col-span-9">
                <div className="font-semibold">{ev.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  {ev.category ? <span className="mr-2 rounded bg-white/10 px-2 py-0.5">{ev.category}</span> : null}
                  {ev.location ? <span className="mr-2">📍 {ev.location}</span> : null}
                </div>
                {ev.note ? <div className="mt-1 text-xs opacity-80">{ev.note}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section
        title="Major Upcoming Events, Holidays or Campaigns"
        open={openUpcoming}
        onToggle={() => setOpenUpcoming((v) => !v)}
        items={upcoming}
      />
      <Section
        title="Major Past Events, Holidays or Campaigns"
        open={openPast}
        onToggle={() => setOpenPast((v) => !v)}
        items={past}
      />
    </div>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  const y = d.getFullYear();
  const m = `${d.getMonth()+1}`.padStart(2,"0");
  const day = `${d.getDate()}`.padStart(2,"0");
  return `${day}/${m}/${y}`;
}
