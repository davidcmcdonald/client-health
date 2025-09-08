// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

const COMMS_ICON = { Email: "✉️", Text: "💬", Phone: "📞" };
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function classNames(...a) { return a.filter(Boolean).join(" "); }

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 p-5 shadow-sm animate-pulse">
      <div className="h-14 w-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 mb-2" />
      <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function Logo({ slug, file }) {
  if (file) {
    return (
      <img
        src={`/logos/${file}`}
        alt={slug || "logo"}
        className="h-14 w-14 rounded-xl object-contain bg-white"
      />
    );
  }
  const initials = (slug || "??").toString().slice(0, 3).toUpperCase();
  return (
    <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold">
      {initials}
    </div>
  );
}

/* ---------------- helpers ---------------- */
function toMonthIndex(m) {
  if (m == null || m === "") return null;
  if (typeof m === "number") return Math.max(1, Math.min(12, m)) - 1;
  const s = String(m).trim().toLowerCase();
  const long = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const iLong = long.indexOf(s);
  if (iLong !== -1) return iLong;
  const iShort = MONTHS_SHORT.map(x=>x.toLowerCase()).indexOf(s.slice(0,3));
  if (iShort !== -1) return iShort;
  const n = Number(s);
  if (!Number.isNaN(n)) return Math.max(1, Math.min(12, n)) - 1;
  return null;
}

function dateFromSheet(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatDate(d) {
  return d ? d.toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" }) : "—";
}

/** Whole months difference (floored) between d1 -> d2 */
function monthsBetween(d1, d2) {
  if (!d1 || !d2) return null;
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() < d1.getDate()) months -= 1;
  return Math.max(0, months);
}

/** LQR status: green <=3mo, orange ==4mo, red >=5mo, grey if missing */
function lqrStatus(date) {
  const m = monthsBetween(date, new Date());
  if (m == null) return { label: "—", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" };
  if (m <= 3) return { label: "Up to date", cls: "bg-emerald-500 text-white" };
  if (m === 4) return { label: "Due soon", cls: "bg-orange-500 text-white" };
  return { label: "Overdue", cls: "bg-rose-500 text-white" };
}

// Monthly chip status (per-month deliverables):
// red = not_complete, orange = nearly_complete, yellow = complete_not_sent, green = complete_sent, gray = no_plan
function monthStatus(rec) {
  if (!rec || (rec.planned ?? 0) === 0) return "no_plan";
  const p = rec.planned || 0, d = rec.done || 0, s = rec.sent || 0;
  if (d === 0) return "not_complete";
  if (d < p) return "nearly_complete";
  if (d >= p && s < p) return "complete_not_sent";
  if (d >= p && s >= p) return "complete_sent";
  return "nearly_complete";
}

function MonthPill({ label, status }) {
  const styles = {
    complete_sent: "bg-emerald-500 text-white",
    complete_not_sent: "bg-yellow-400 text-zinc-900",
    nearly_complete: "bg-orange-500 text-white",
    not_complete: "bg-rose-500 text-white",
    no_plan: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  }[status || "no_plan"];
  return (
    <span className={classNames("px-2.5 py-1 rounded-full text-xs font-medium", styles)}>
      {label}
    </span>
  );
}

export default function Page() {
  const [clients, setClients] = useState(null);
  const [events, setEvents] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [cRes, eRes, mRes] = await Promise.all([
          fetch("/api/sheet?sheet=Clients", { cache: "no-store" }),
          fetch("/api/sheet?sheet=Events", { cache: "no-store" }),
          fetch("/api/sheet?sheet=Monthly", { cache: "no-store" }),
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
            .sort((a,b) => {
              const da = a.Date ? new Date(a.Date) : null;
              const db = b.Date ? new Date(b.Date) : null;
              if (!da && !db) return 0;
              if (!da) return 1;
              if (!db) return -1;
              return da - db;
            })
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

  // Build: slug -> year -> monthIndex -> { planned, done, sent }
  const currentYear = new Date().getFullYear();
  const monthDataBySlug = useMemo(() => {
    const out = {};
    if (!monthly) return out;
    for (const row of monthly) {
      const slug = String(row.Slug || row.slug || "").trim();
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

  const eventsByClient = useMemo(() => {
    if (!events) return {};
    const map = {};
    for (const ev of events) {
      const key = ev.Client;
      if (!key) continue;
      (map[key] ||= []).push(ev);
    }
    return map;
  }, [events]);

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Vito Media Client Health</h1>
        <div className="text-red-600">Error: {error}</div>
      </main>
    );
  }

  const nowYear = currentYear;

  return (
    <main className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Vito Media Client Health</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Live from Google Sheets — Clients + Major Upcoming Events
        </p>
      </header>

      {/* Clients Grid */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Clients</h2>
        {!clients ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c, idx) => {
              const slug = c["Slug"] || "";
              const commsType = c["Last Comms Type"];
              const commsIcon = COMMS_ICON[commsType] || "🗒️";
              const nextEvent = (eventsByClient[c["Client"]] || [])[0];

              // Last Quarterly Review pill (colour by age)
              const lqrDate = dateFromSheet(c["Last Quarterly Review"]);
              const lqr = lqrStatus(lqrDate);

              // Month chips for current year
              const monthsForYear = monthDataBySlug[slug]?.[nowYear] || {};
              const pills = MONTHS_SHORT.map((label, i) => {
                const rec = monthsForYear[i];
                return { label, status: monthStatus(rec) };
              });

              return (
                <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-5 shadow-sm hover:shadow transition">
                  <div className="flex items-center gap-4">
                    <Logo slug={slug} file={c["LogoFile"]} />
                    <div>
                      <div className="text-lg font-semibold">{c["Client"] || "—"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-zinc-500">
                          Lead: <span className="font-medium text-zinc-700 dark:text-zinc-200">{c["Client Lead"] || "-"}</span>
                        </span>
                        <span className="text-zinc-500">
                          · Assist: <span className="font-medium text-zinc-700 dark:text-zinc-200">{c["Client Assist"] || "-"}</span>
                        </span>
                        {/* LQR pill */}
                        <span className={classNames("ml-2 rounded-full px-2 py-0.5", "text-xs font-medium", lqr.cls)}>
                          LQR {formatDate(lqrDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm">
                      <div className="text-zinc-500">Last comms</div>
                      <div className="font-medium">
                        <span className="mr-1">{commsIcon}</span>
                        {commsType || "—"}{" "}
                        <span className="text-zinc-500">· {c["Last Comms Date"] || "—"}</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                      {slug}
                    </span>
                  </div>

                  {/* Month chips */}
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">This year</div>
                    <div className="grid grid-cols-6 gap-2">
                      {pills.map((p, i) => (
                        <MonthPill key={i} label={p.label} status={p.status} />
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {c["Comms Notes"] && (
                    <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                      {c["Comms Notes"]}
                    </div>
                  )}

                  {/* Next Event */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Next Event</div>
                    {nextEvent ? (
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{nextEvent.Title}</div>
                          <div className="text-zinc-500">{nextEvent.Notes || ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-500">{nextEvent.Date}</div>
                          {nextEvent.Priority && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                              {nextEvent.Priority}
                            </span>
                          )}
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
      </section>

      {/* Events Table */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Major Upcoming Events or Campaigns</h2>
        {!events ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">Loading events…</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i} className={i % 2 ? "bg-white dark:bg-zinc-900/20" : ""}>
                    <td className="px-4 py-3 whitespace-nowrap">{ev.Date || "—"}</td>
                    <td className="px-4 py-3">{ev.Client || "—"}</td>
                    <td className="px-4 py-3 font-medium">{ev.Title || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{ev.Notes || ""}</td>
                    <td className="px-4 py-3">
                      {ev.Priority ? (
                        <span className="inline-block text-xs px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
                          {ev.Priority}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-8 text-xs text-zinc-500">
        Last refreshed on page load. Update Google Sheets → refresh here.
      </footer>
    </main>
  );
}
