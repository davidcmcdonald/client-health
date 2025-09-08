"use client";

import { useEffect, useMemo, useState } from "react";

// Emoji for comms channel — easy to swap for SVGs later
const COMMS_ICON = { Email: "✉️", Text: "💬", Phone: "📞" };

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
        alt={slug}
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

/* ---------------------------
   Header normalisation utils
---------------------------- */
const norm = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\-\/]+/g, " ")
    .replace(/\s+/g, " ");

const CLIENT_KEY_MAP = {
  // canonical -> accepted variants
  "Client": ["client", "client name", "name"],
  "Slug": ["slug", "client code", "code", "short code"],
  "LogoFile": ["logofile", "logo file", "logo", "logo filename", "logo path"],
  "Client Lead": ["client lead", "lead", "client lead (primary)", "client lead (lead)"],
  "Client Assist": ["client assist", "assist", "assistant", "secondary"],
  "Last Comms Date": ["last comms date", "last comms", "last communication date", "last contact date"],
  "Last Comms Type": ["last comms type", "last comms channel", "last communication type", "last contact type"],
  "Comms Notes": ["comms notes", "notes", "last comms notes", "comments"],
};

const EVENTS_KEY_MAP = {
  "Date": ["date", "event date"],
  "Client": ["client", "client name"],
  "Title": ["title", "event", "campaign"],
  "Notes": ["notes", "detail", "description"],
  "Priority": ["priority", "prio"],
};

function buildIndexMap(headers, keyMap) {
  // headers: array of column labels from GViz
  const hNorm = headers.map((h) => norm(h));
  const out = {}; // canonical -> index
  Object.entries(keyMap).forEach(([canonical, variants]) => {
    const firstIdx = hNorm.findIndex((h) => variants.includes(h));
    if (firstIdx !== -1) out[canonical] = firstIdx;
  });
  return out;
}

function mapRowsToCanonical(headers, rows, keyMap) {
  const idxMap = buildIndexMap(headers, keyMap);
  return rows.map((r) => {
    const obj = {};
    Object.entries(idxMap).forEach(([canonical, i]) => {
      obj[canonical] = r[i] ?? null;
    });
    return obj;
  });
}

function hasAnyValue(obj) {
  return Object.values(obj).some((v) => v !== null && v !== "" && v !== undefined);
}

export default function Page() {
  const [clients, setClients] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [cRes, eRes] = await Promise.all([
          fetch("/api/sheet?sheet=Clients", { cache: "no-store" }),
          fetch("/api/sheet?sheet=Events", { cache: "no-store" }),
        ]);
        if (!cRes.ok) throw new Error("Failed to load Clients");
        if (!eRes.ok) throw new Error("Failed to load Events");

        const cData = await cRes.json();
        const eData = await eRes.json();

        // Convert [[values]] into canonical objects, tolerate header variations
        const cRowsRaw = cData.rows.map((r) => Object.fromEntries(r.map((v, i) => [cData.columns[i], v])));
        const eRowsRaw = eData.rows.map((r) => Object.fromEntries(r.map((v, i) => [eData.columns[i], v])));

        const cRowsCanon = mapRowsToCanonical(cData.columns, cData.rows, CLIENT_KEY_MAP)
          .filter(hasAnyValue)
          .map((row) => ({
            // sensible fallbacks
            ...row,
            Slug: row["Slug"] || "", // if empty, UI will show ?? on the logo
            LogoFile: row["LogoFile"] || "",
          }));

        const eRowsCanon = mapRowsToCanonical(eData.columns, eData.rows, EVENTS_KEY_MAP)
          .filter(hasAnyValue)
          .map((row) => ({
            ...row,
            // normalise date to YYYY-MM-DD if GViz formatted string exists in original raw row
            Date: row.Date || null,
          }));

        // If we failed to map (e.g., headers are already canonical), fall back to exact names
        const fallbackIfEmpty = (arr, raw, expectedKeys) => {
          if (arr.length > 0) return arr;
          const clean = raw.map((o) => {
            const out = {};
            expectedKeys.forEach((k) => (out[k] = o[k] ?? null));
            return out;
          }).filter(hasAnyValue);
          return clean;
        };

        setClients(
          fallbackIfEmpty(cRowsCanon, cRowsRaw, [
            "Client", "Slug", "LogoFile", "Client Lead", "Client Assist", "Last Comms Date", "Last Comms Type", "Comms Notes",
          ]).sort((a, b) => (a.Client || "").localeCompare(b.Client || ""))
        );

        setEvents(
          fallbackIfEmpty(eRowsCanon, eRowsRaw, [
            "Date", "Client", "Title", "Notes", "Priority",
          ]).sort((a, b) => {
            const da = a.Date ? new Date(a.Date) : null;
            const db = b.Date ? new Date(b.Date) : null;
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            return da - db;
          })
        );
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, []);

  const eventsByClient = useMemo(() => {
    if (!events) return {};
    const map = {};
    for (const ev of events) {
      const key = ev.Client;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
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

  return (
    <main className="max-w-7xl mx-auto p-6">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vito Media Client Health</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Live from Google Sheets — Clients + Major Upcoming Events
          </p>
        </div>
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
              const commsType = c["Last Comms Type"];
              const commsIcon = COMMS_ICON[commsType] || "🗒️";
              const nextEvent = (eventsByClient[c["Client"]] || [])[0];

              return (
                <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-5 shadow-sm hover:shadow transition">
                  <div className="flex items-center gap-4">
                    <Logo slug={c["Slug"]} file={c["LogoFile"]} />
                    <div>
                      <div className="text-lg font-semibold">{c["Client"] || "—"}</div>
                      <div className="text-xs text-zinc-500">
                        Lead: <span className="font-medium text-zinc-700 dark:text-zinc-200">{c["Client Lead"] || "-"}</span> ·{" "}
                        Assist: <span className="font-medium text-zinc-700 dark:text-zinc-200">{c["Client Assist"] || "-"}</span>
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
                      {c["Slug"] || ""}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {c["Comms Notes"] || ""}
                  </div>

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
