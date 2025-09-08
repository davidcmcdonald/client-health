// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------------- constants ---------------- */
const COMMS_ICON = { Email: "✉️", Text: "💬", Phone: "📞" };
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// Canonical status labels
const STATUS_LABELS = [
  "no content organised or needed",
  "content planned",
  "content scheduled",
];

/* ---------------- small utils ---------------- */
function classNames(...a) { return a.filter(Boolean).join(" "); }
function dateFromSheet(v) { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
function formatDate(d) { return d ? d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "—"; }
function normalizeSlug(s){ return String(s||"").trim().toUpperCase(); }

function monthsBetween(d1, d2) {
  if (!d1 || !d2) return null;
  let months = (d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth());
  if (d2.getDate() < d1.getDate()) months -= 1;
  return Math.max(0, months);
}
function daysSince(d) {
  if (!d) return null;
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / (1000*60*60*24)));
}

/* Last Quarterly Review pill: green ≤3 mo, orange =4 mo, red ≥5 mo, grey if missing */
function lqrStatus(date) {
  const m = monthsBetween(date, new Date());
  if (m == null) return { label: "LQR —", cls: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" };
  if (m <= 3) return { label: `LQR ${formatDate(date)}`, cls: "bg-emerald-500 text-white" };
  if (m === 4) return { label: `LQR ${formatDate(date)}`, cls: "bg-orange-500 text-white" };
  return { label: `LQR ${formatDate(date)}`, cls: "bg-rose-500 text-white" };
}

/* Last Comms pill: green ≤7 days, red >7, grey if missing */
function commsRecency(date) {
  const d = daysSince(date);
  if (d == null) return { label: "—", cls: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" };
  return d <= 7
    ? { label: `${d}d`, cls: "bg-emerald-500 text-white" }
    : { label: `${d}d`, cls: "bg-rose-500 text-white" };
}

/* Monthly helpers */
function toMonthIndex(m) {
  if (m == null || m === "") return null;
  if (typeof m === "number") return Math.max(1, Math.min(12, m)) - 1;
  const s = String(m).trim().toLowerCase();
  const long = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const iLong = long.indexOf(s); if (iLong !== -1) return iLong;
  const iShort = MONTHS_SHORT.map(x=>x.toLowerCase()).indexOf(s.slice(0,3)); if (iShort !== -1) return iShort;
  const n = Number(s); if (!Number.isNaN(n)) return Math.max(1, Math.min(12, n)) - 1;
  return null;
}
/* red = not_complete, orange = nearly_complete, yellow = complete_not_sent, green = complete_sent, gray = no_plan */
function monthStatus(rec) {
  if (!rec || (rec.planned ?? 0) === 0) return "no_plan";
  const p = rec.planned || 0, d = rec.done || 0, s = rec.sent || 0;
  if (d === 0) return "not_complete";
  if (d < p) return "nearly_complete";
  if (d >= p && s < p) return "complete_not_sent";
  if (d >= p && s >= p) return "complete_sent";
  return "nearly_complete";
}

/* Status normalization + per-client parser */
function normalizeStatus(s) {
  const raw = String(s||"").toLowerCase().replace(/\s+/g," ").trim();
  const hit = STATUS_LABELS.find(x => x === raw);
  return hit || null;
}
function parseClientStatuses(cell) {
  // Accept "JA: content planned; OK=content scheduled, GM: no content organised or needed"
  const map = {};
  if (!cell) return map;
  const parts = String(cell).split(/[;,]/); // split by , or ;
  for (const p of parts) {
    const [k,...rest] = p.split(/[:=]/);
    const slug = normalizeSlug(k);
    const status = normalizeStatus(rest.join(":").trim());
    if (slug && status) map[slug] = status;
  }
  return map;
}

/* ---------------- UI bits ---------------- */
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-5 shadow-sm animate-pulse">
      <div className="h-14 w-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 mb-2" />
      <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
function Logo({ slug, file }) {
  if (file) {
    return <img src={`/logos/${file}`} alt={slug || "logo"} className="h-14 w-14 rounded-xl object-contain bg-white ring-1 ring-zinc-200 dark:ring-zinc-800" />;
  }
  const initials = (slug || "??").toString().slice(0,3).toUpperCase();
  return <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-zinc-900 text-white font-semibold">{initials}</div>;
}
function MonthPill({ label, status }) {
  const styles = {
    complete_sent: "bg-emerald-500 text-white",
    complete_not_sent: "bg-yellow-400 text-zinc-900",
    nearly_complete: "bg-orange-500 text-white",
    not_complete: "bg-rose-500 text-white",
    no_plan: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  }[status || "no_plan"];
  return <span className={classNames("px-2.5 py-1 rounded-full text-xs font-medium", styles)}>{label}</span>;
}
function StatusChip({ status }) {
  const map = {
    "no content organised or needed": { cls: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300", label: "No content" },
    "content planned": { cls: "bg-amber-500 text-white", label: "Planned" },
    "content scheduled": { cls: "bg-sky-500 text-white", label: "Scheduled" },
  };
  const s = map[normalizeStatus(status) || ""] || { cls: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300", label: "—" };
  return <span className={classNames("px-2 py-0.5 rounded-full text-xs font-medium", s.cls)}>{s.label}</span>;
}

/* ---------------- Page ---------------- */
export default function Page() {
  const [clients, setClients] = useState(null);
  const [events, setEvents] = useState(null);   // shared events
  const [monthly, setMonthly] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [cRes, eRes, mRes] = await Promise.all([
          fetch("/api/sheet?sheet=Clients",  { cache: "no-store" }),
          fetch("/api/sheet?sheet=Events",   { cache: "no-store" }),
          fetch("/api/sheet?sheet=Monthly",  { cache: "no-store" }),
        ]);
        if (!cRes.ok) throw new Error("Failed to load Clients");
        if (!eRes.ok) throw new Error("Failed to load Events");
        if (!mRes.ok) throw new Error("Failed to load Monthly");

        const [cData, eData, mData] = await Promise.all([cRes.json(), eRes.json(), mRes.json()]);
        const mapRows = (cols, rows) => rows.map(r => Object.fromEntries(r.map((v,i)=>[cols[i], v])));

        setClients(
          mapRows(cData.columns, cData.rows)
            .filter(o => Object.values(o).some(v => v != null && String(v).trim() !== ""))
            .sort((a,b)=> (a["Client"] || "").localeCompare(b["Client"] || ""))
        );

        setEvents(
          mapRows(eData.columns, eData.rows)
            .filter(o => Object.values(o).some(v => v != null && String(v).trim() !== ""))
            .map(o => {
              const _date = dateFromSheet(o.Date);
              const _slugs = String(o.Clients || "").split(/[,\s]+/).map(s => normalizeSlug(s)).filter(Boolean);
              const _statusDefault = normalizeStatus(o.Status);
              const _statusByClient = parseClientStatuses(o["Client Statuses"] || "");
              return { ...o, _date, _slugs, _statusDefault, _statusByClient };
            })
            .filter(o => o._date) // only keep parsable dates
            .sort((a,b)=> a._date - b._date)
        );

        setMonthly(
          mapRows(mData.columns, mData.rows)
            .filter(o => Object.values(o).some(v => v != null && String(v).trim() !== ""))
        );
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, []);

  const slugToName = useMemo(() => {
    const map = {};
    (clients || []).forEach(c => { if (c.Slug) map[normalizeSlug(c.Slug)] = c.Client; });
    return map;
  }, [clients]);

  // Build: slug -> year -> monthIndex -> { planned, done, sent }
  const currentYear = new Date().getFullYear();
  const monthDataBySlug = useMemo(() => {
    const out = {};
    if (!monthly) return out;
    for (const row of monthly) {
      const slug = normalizeSlug(row.Slug || row.slug);
      const year = Number(row.Year || row.year);
      const mIdx = toMonthIndex(row.Month);
      const planned = Number(row.Planned || 0);
      const done = Number(row.Done || 0);
      const sent = Number(row.Sent || 0);
      if (!slug || Number.isNaN(year) || mIdx == null) continue;
      out[slug] ||= {};
      out[slug][year] ||= {};
      out[slug][year][mIdx] = { planned, done, sent };
    }
    return out;
  }, [monthly]);

  // Events -> map by slug for "next event" lookup
  const eventsBySlug = useMemo(() => {
    if (!events) return {};
    const m = {};
    for (const e of events) {
      for (const s of e._slugs) (m[s] ||= []).push(e);
    }
    // each list already sorted asc
    return m;
  }, [events]);

  const filtered = useMemo(() => {
    if (!clients) return null;
    if (!q) return clients;
    const qq = q.toLowerCase();
    return clients.filter(c =>
      String(c.Client || "").toLowerCase().includes(qq) ||
      String(c.Slug || "").toLowerCase().includes(qq) ||
      String(c["Client Lead"] || "").toLowerCase().includes(qq)
    );
  }, [clients, q]);

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Vito Media Client Health</h1>
        <div className="text-rose-600">{error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white grid place-items-center shadow-sm">▦</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vito Media Client Health</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Live from Google Sheets — Clients • Monthly • Events</p>
            </div>
          </div>
          <div className="w-full sm:w-80">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search clients…"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </header>

        {/* Clients Grid */}
        {!filtered ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, idx) => {
              const slug = normalizeSlug(c.Slug);
              const lqr = lqrStatus(dateFromSheet(c["Last Quarterly Review"]));
              const commsType = c["Last Comms Type"];
              const commsIcon = COMMS_ICON[commsType] || "🗒️";
              const commsDate = dateFromSheet(c["Last Comms Date"]);
              const commsPill = commsRecency(commsDate);

              // Month chips
              const monthsForYear = monthDataBySlug[slug]?.[currentYear] || {};
              const pills = MONTHS_SHORT.map((label, i) => ({ label, status: monthStatus(monthsForYear[i]) }));

              // Next event (shared events: by slug)
              const nextEvent = (eventsBySlug[slug] || []).find(e => e._date >= new Date());
              const nextStatus =
                nextEvent
                  ? (nextEvent._statusByClient[slug] || nextEvent._statusDefault || "no content organised or needed")
                  : null;

              return (
                <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 p-5 shadow-sm hover:shadow transition">
                  {/* header */}
                  <div className="flex items-center gap-4">
                    <Logo slug={slug} file={c.LogoFile} />
                    <div className="min-w-0">
                      <div className="text-lg font-semibold truncate">{c.Client || "—"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-zinc-500">
                          Lead: <span className="font-medium text-zinc-700 dark:text-zinc-200">{c["Client Lead"] || "-"}</span>
                        </span>
                        <span className="text-zinc-500">
                          · Assist: <span className="font-medium text-zinc-700 dark:text-zinc-200">{c["Client Assist"] || "-"}</span>
                        </span>
                        {/* LQR pill */}
                        <span className={classNames("ml-1 rounded-full px-2 py-0.5 text-xs font-medium", lqr.cls)}>{lqr.label}</span>
                      </div>
                    </div>
                    <span className="ml-auto px-2 py-1 rounded-full text-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                      {slug}
                    </span>
                  </div>

                  {/* last comms */}
                  <div className="mt-4 flex items-center gap-2 text-sm flex-wrap">
                    <div className="text-zinc-500">Last comms</div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="mr-1">{commsIcon}</span>
                      <span>{commsType || "—"}</span>
                      <span className="text-zinc-500">· {c["Last Comms Date"] || "—"}</span>
                      <span className={classNames("rounded-full px-2 py-0.5 text-xs font-medium", commsPill.cls)}>{commsPill.label}</span>
                    </div>
                  </div>

                  {/* month chips */}
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">This year</div>
                    <div className="grid grid-cols-6 gap-2">
                      {pills.map((p, i) => <MonthPill key={i} label={p.label} status={p.status} />)}
                    </div>
                  </div>

                  {/* next event block */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Next Event</div>
                    {nextEvent ? (
                      <div className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{nextEvent.Event}</div>
                          <div className="text-zinc-500 truncate">{nextEvent.Notes || ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-500">{formatDate(nextEvent._date)}</div>
                          <div className="mt-1">
                            <StatusChip status={nextStatus} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500">No upcoming events</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Events table (shared events w/ per-client status) */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Major Upcoming Events</h2>
          {!events ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 p-6 shadow-sm">
              Loading events…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Clients</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={i} className={i % 2 ? "bg-white/60 dark:bg-zinc-900/30" : ""}>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(ev._date)}</td>
                      <td className="px-4 py-3 font-medium">{ev.Event || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ev._slugs.map((s, idx) => {
                            const label = slugToName[s] || s;
                            const st = ev._statusByClient[s] || ev._statusDefault || "no content organised or needed";
                            return (
                              <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-950">
                                {label} <StatusChip status={st} />
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{ev.Notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 text-xs text-zinc-500">
          Live from Google Sheets. Update the sheet → refresh here.
        </footer>
      </div>
    </main>
  );
}
