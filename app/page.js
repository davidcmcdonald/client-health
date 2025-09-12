// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------------- constants ---------------- */

// Exact icon map (keys must match sheet values exactly)
const COMMS_ICON = Object.freeze({
  "Phone": "☎️",
  "Email": "📧",
  "Text": "📱",
  "Online Meeting": "💻",
  "In Person": "🤝",
});

// Month labels for chips
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Event status labels (for the Events sheet)
const STATUS_LABELS = [
  "no content organised or needed",
  "content planned",
  "content scheduled",
];

/* ---------------- tiny utils ---------------- */
function cn(...a){return a.filter(Boolean).join(" ");}

function dateFromSheet(v){
  if(!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmt(d){
  return d ? d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "—";
}

function normalizeSlug(s){ return String(s||"").trim().toUpperCase(); }
function normalizeName(s){ return String(s||"").trim().toLowerCase(); }

function monthsBetween(a,b){
  if(!a||!b) return null;
  let m=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth());
  if(b.getDate()<a.getDate()) m-=1;
  return Math.max(0,m);
}

function daysSince(d){
  if(!d) return null;
  const ms=Date.now()-d.getTime();
  return Number.isNaN(ms)?null:Math.max(0,Math.floor(ms/86400000));
}

/* LQR pill: green ≤3mo, orange =4mo, red ≥5mo, grey missing */
function lqrStatus(date){
  const m=monthsBetween(date,new Date());
  if(m==null) return {label:"LQR —", cls:"bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"};
  if(m<=3) return {label:`LQR ${fmt(date)}`, cls:"bg-emerald-500 text-white"};
  if(m===4) return {label:`LQR ${fmt(date)}`, cls:"bg-orange-500 text-white"};
  return {label:`LQR ${fmt(date)}`, cls:"bg-rose-500 text-white"};
}

/* Last Comms pill (uses exact icons, ≤7d green, >7d red, missing grey) */
function commsRecency(date, type) {
  const icon = COMMS_ICON[type] ?? "🗒️";
  const d = daysSince(date);
  if (d == null) {
    return { label: `${icon} Last Comms —`, cls: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300" };
  }
  return d <= 7
    ? { label: `${icon} Last Comms ${d}d`, cls: "bg-emerald-500 text-white" }
    : { label: `${icon} Last Comms ${d}d`, cls: "bg-rose-500 text-white" };
}

/* ---------------- Monthly helpers ---------------- */
function toMonthIndex(m){
  if(m==null||m==="") return null;
  if(typeof m==="number") return Math.max(1,Math.min(12,m))-1;
  const s=String(m).trim().toLowerCase();
  const long=["january","february","march","april","may","june","july","august","september","october","november","december"];
  let i=long.indexOf(s); if(i!==-1) return i;
  i=MONTHS_SHORT.map(x=>x.toLowerCase()).indexOf(s.slice(0,3)); if(i!==-1) return i;
  const n=Number(s); if(!Number.isNaN(n)) return Math.max(1,Math.min(12,n))-1;
  return null;
}

function normalizeMonthState(s){
  const raw = String(s || "").trim().toLowerCase();
  // New three statuses
  if (raw === "sent") return "sent";
  if (raw === "incomplete") return "incomplete";
  if (raw === "overdue") return "overdue";
  // Legacy synonyms → map to closest
  if (["delivered","complete and sent","green"].includes(raw)) return "sent";
  if (["not sent","planned","plan","p","done","complete","completed","yellow"].includes(raw)) return "incomplete";
  if (["late","red"].includes(raw)) return "overdue";
  return null; // anything else = no entry ⇒ grey
}

function monthPillColor(state) {
  switch (String(state || "").toLowerCase()) {
    case "sent": return "green";
    case "incomplete": return "yellow";
    case "overdue": return "red";
    default: return "grey";
  }
}

/* ---------------- Events helpers ---------------- */
function normalizeStatus(s){
  const raw=String(s||"").toLowerCase().replace(/\s+/g," ").trim();
  return STATUS_LABELS.find(x=>x===raw) || null;
}
function parseClientStatuses(cell){
  const map={}; if(!cell) return map;
  const parts=String(cell).split(/[;,]/);
  for(const p of parts){
    const [k,...rest]=p.split(/[:=]/);
    const slug=normalizeSlug(k); const st=normalizeStatus(rest.join(":").trim());
    if(slug && st) map[slug]=st;
  }
  return map;
}

/* ---------------- misc helpers ---------------- */
function splitNames(s){
  if(!s) return [];
  return String(s).split(/\/|,|&|\band\b|·|\+|\|/gi).map(x=>x.trim()).filter(Boolean);
}

/* ---------------- Theme toggle ---------------- */
function useTheme(){
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const doc = document.documentElement;
    let current = doc.getAttribute("data-theme");
    if (!current) {
      const m = document.cookie.match(/(?:^|;)\s*theme=(light|dark)\b/);
      current = m ? m[1] : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    apply(current);

    function onChange(e){
      try {
        const saved = localStorage.getItem("theme");
        if (!saved || saved === "system") apply(e.matches ? "dark" : "light");
      } catch(_) {}
    }
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
    return () => {
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener("change", onChange);
        else if (mq.removeListener) mq.removeListener(onChange);
      }
    };
  }, []);

  function apply(theme){
    const doc = document.documentElement;
    if (theme === "dark") doc.classList.add("dark"); else doc.classList.remove("dark");
    doc.setAttribute("data-theme", theme);
    doc.style.colorScheme = (theme === "dark") ? "dark" : "light";
    try { localStorage.setItem("theme", theme); } catch(_) {}
    document.cookie = "theme=" + theme + "; path=/; max-age=31536000";
  }
  function toggle(){ apply(document.documentElement.classList.contains("dark") ? "light" : "dark"); }

  return { mounted, toggle };
}

/* ---------------- UI atoms ---------------- */
function MonthPill({label,color}){
  const styles={
    green:"bg-emerald-500 text-white",
    yellow:"bg-yellow-400 text-zinc-900",
    red:"bg-rose-500 text-white",
    grey:"bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  }[color||"grey"];
  return <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium",styles)}>{label}</span>;
}

function StatusChip({status}){
  const map={
    "no content organised or needed":{cls:"bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",label:"No content"},
    "content planned":{cls:"bg-amber-500 text-white",label:"Planned"},
    "content scheduled":{cls:"bg-sky-500 text-white",label:"Scheduled"},
  };
  const s=map[normalizeStatus(status)||""]||{cls:"bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",label:"—"};
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",s.cls)}>{s.label}</span>;
}

function Tooltip({children,content,width="w-80"}){
  return (
    <span className="relative group inline-block">
      {children}
      <span className={cn("pointer-events-none absolute left-0 top-[120%] z-30 hidden", width, "group-hover:block")}>
        <span className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xl">
          {content}
        </span>
      </span>
    </span>
  );
}

function PersonBadge({ name, person, prefix }){
  return (
    <span className="relative group inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2">
      {prefix && <span className="text-zinc-500">{prefix}:</span>}
      <span>{name}</span>
      <span className="pointer-events-none absolute left-0 top-[120%] z-20 hidden w-64 group-hover:block">
        <span className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xl">
          <div className="text-sm font-medium">{person?.Name || name}</div>
          {person?.Role && <div className="text-xs text-zinc-500">{person.Role}</div>}
          <div className="mt-2 space-y-1 text-sm">
            {person?.Email ? (
              <div><a className="text-emerald-600 dark:text-emerald-400 hover:underline" href={`mailto:${person.Email}`}>{person.Email}</a></div>
            ) : <div className="text-zinc-500">No email</div>}
            {person?.Phone ? (
              <div><a className="text-emerald-600 dark:text-emerald-400 hover:underline" href={`tel:${person.Phone}`}>{person.Phone}</a></div>
            ) : <div className="text-zinc-500">No phone</div>}
            {person?.Notes && <div className="text-xs text-zinc-500">{person.Notes}</div>}
          </div>
        </span>
      </span>
    </span>
  );
}

/* ---------------- page ---------------- */
export default function Page(){
  const [clients,setClients]=useState(null);
  const [events,setEvents]=useState(null);
  const [monthly,setMonthly]=useState(null);
  const [team,setTeam]=useState(null);
  const [contacts,setContacts]=useState(null);
  const [scope,setScope]=useState(null);
  const [error,setError]=useState("");
  const [q,setQ]=useState("");
  const { mounted, toggle } = useTheme();
  const SHEET_URL = process.env.NEXT_PUBLIC_SHEET_URL;

  useEffect(()=>{ (async()=>{
    try{
      const [cRes,eRes,mRes,tRes,ctRes,sRes]=await Promise.all([
        fetch("/api/sheet?sheet=Clients",{cache:"no-store"}),
        fetch("/api/sheet?sheet=Events",{cache:"no-store"}),
        fetch("/api/sheet?sheet=Monthly",{cache:"no-store"}),
        fetch("/api/sheet?sheet=Team",{cache:"no-store"}),
        fetch("/api/sheet?sheet=Contacts",{cache:"no-store"}),
        fetch("/api/sheet?sheet=Scope",{cache:"no-store"}),
      ]);
      if(!cRes.ok) throw new Error("Failed to load Clients");
      if(!eRes.ok) throw new Error("Failed to load Events");
      if(!mRes.ok) throw new Error("Failed to load Monthly");

      const [cData,eData,mData,tData,ctData,sData]=await Promise.all([
        cRes.json(), eRes.json(), mRes.json(),
        tRes.ok ? tRes.json() : Promise.resolve({columns:[],rows:[]}),
        ctRes.ok ? ctRes.json() : Promise.resolve({columns:[],rows:[]}),
        sRes.ok ? sRes.json() : Promise.resolve({columns:[],rows:[]}),
      ]);
      const mapRows=(cols,rows)=>rows.map(r=>Object.fromEntries(r.map((v,i)=>[cols[i],v])));

      setClients(
        mapRows(cData.columns,cData.rows)
          .filter(o=>Object.values(o).some(v=>v!=null && String(v).trim()!==""))
          .sort((a,b)=>(a["Client"]||"").localeCompare(b["Client"]||""))
      );

      setEvents(
        mapRows(eData.columns,eData.rows)
          .filter(o=>Object.values(o).some(v=>v!=null && String(v).trim()!==""))
          .map(o=>{
            const _date=dateFromSheet(o.Date);
            const _slugs=String(o.Clients||"").split(/[,\s]+/).map(s=>normalizeSlug(s)).filter(Boolean);
            const _statusDefault=normalizeStatus(o.Status);
            const _statusByClient=parseClientStatuses(o["Client Statuses"]||"");
            return {...o,_date,_slugs,_statusDefault,_statusByClient};
          })
          .filter(o=>o._date)
          .sort((a,b)=>a._date-b._date)
      );

      setMonthly(
        mapRows(mData.columns,mData.rows)
          .filter(o=>Object.values(o).some(v=>v!=null && String(v).trim()!==""))
      );

      setTeam(mapRows(tData.columns,tData.rows));
      setContacts(mapRows(ctData.columns,ctData.rows));
      setScope(mapRows(sData.columns,sData.rows));
    }catch(e){ setError(e.message); }
  })(); },[]);

  // Team maps
  const teamByName=useMemo(()=>{
    const map={};
    (team||[]).forEach(p=>{
      const k=normalizeName(p.Name);
      if(k) map[k]=p;
      const first=k.split(/\s+/)[0];
      if(first && !map[first]) map[first]=p;
    });
    return map;
  },[team]);

  const leadsBySlug = useMemo(()=>{
    const out={}; (team||[]).forEach(t=>{
      String(t.Leads||"").split(/[,;\s]+/).forEach(s=>{
        const slug=normalizeSlug(s); if(slug) (out[slug] ||= []).push(t);
      });
    }); return out;
  },[team]);

  const assistsBySlug = useMemo(()=>{
    const out={}; (team||[]).forEach(t=>{
      String(t.Assists||"").split(/[,;\s]+/).forEach(s=>{
        const slug=normalizeSlug(s); if(slug) (out[slug] ||= []).push(t);
      });
    }); return out;
  },[team]);

  // Contacts map
  const contactsBySlug = useMemo(()=>{
    const m={}; (contacts||[]).forEach(r=>{
      const slug=normalizeSlug(r.Slug);
      if(!slug) return;
      m[slug] = {
        primary: r["Primary Name"] ? {
          Name: r["Primary Name"], Email: r["Primary Email"], Phone: r["Primary Phone"], Role: "Primary", Notes: r.Notes || ""
        } : null,
        secondary: r["Secondary Name"] ? {
          Name: r["Secondary Name"], Email: r["Secondary Email"], Phone: r["Secondary Phone"], Role: "Secondary", Notes: r.Notes || ""
        } : null,
        notes: r.Notes || ""
      };
    }); return m;
  },[contacts]);

  // Scope map
  const scopeBySlug = useMemo(()=>{
    const m={};
    (scope||[]).forEach(r=>{
      const slug=normalizeSlug(r.Slug);
      if(!slug) return;
      m[slug] = {
        posts: r["Posts per Week"] ?? "",
        blogs: r["Blogs per Month"] ?? "",
        metaAds: r["Meta Ads"] ?? "",
        googleAds: r["Google Ads"] ?? "",
        videos: r["Videos per Month"] ?? "",
        shorts: r["Shorts per Month"] ?? "",
        images: r["Images per Month"] ?? "",
        notes: r["Notes"] ?? "",
      };
    });
    return m;
  },[scope]);

  // Monthly: slug -> year -> monthIndex -> { state }
  const currentYear=new Date().getFullYear();
  const monthDataBySlug=useMemo(()=>{
    const out={}; if(!monthly) return out;
    for(const row of monthly){
      const slug=normalizeSlug(row.Slug||row.slug);
      const year=Number(row.Year||row.year);
      const mIdx=toMonthIndex(row.Month);
      const state=normalizeMonthState(row.Status || row.status);
      if(!slug || Number.isNaN(year) || mIdx==null) continue;
      out[slug] ||= {}; out[slug][year] ||= {}; out[slug][year][mIdx] = {state};
    }
    return out;
  },[monthly]);

  // Events grouped by slug
  const eventsBySlug=useMemo(()=>{
    if(!events) return {};
    const m={};
    for(const e of events){ for(const s of e._slugs) (m[s] ||= []).push(e); }
    return m;
  },[events]);

  // Search
  const filtered=useMemo(()=>{
    if(!clients) return null;
    if(!q) return clients;
    const qq=q.toLowerCase();
    return clients.filter(c =>
      String(c.Client||"").toLowerCase().includes(qq) ||
      String(c.Slug||"").toLowerCase().includes(qq) ||
      String(c["Client Lead"]||"").toLowerCase().includes(qq) ||
      String(c["Client Assist"]||"").toLowerCase().includes(qq)
    );
  },[clients,q]);

  // KPI chips (only show if count > 0) + hover lists
  const kpiData=useMemo(()=>{
    if(!clients) return null;
    const dueSoon=[], overdue=[], comms7=[];
    for(const c of clients){
      const name = c.Client || c.Slug || "—";
      const lastLQR = dateFromSheet(c["Last Quarterly Review"]);
      const m = monthsBetween(lastLQR, new Date());
      if(m===4) dueSoon.push(name);
      else if(m>=5) overdue.push(name);

      const d = daysSince(dateFromSheet(c["Last Comms Date"]));
      if(d!=null && d>7) comms7.push(name);
    }
    return { dueSoon, overdue, comms7 };
  },[clients]);

  if(error){
    return (
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Vito Media Client Health</h1>
        <div className="text-rose-600">{error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* soft gradient bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_10%_0%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(50%_50%_at_100%_0%,rgba(59,130,246,0.10),transparent_50%),linear-gradient(to_bottom,#fafafa,transparent_30%)] dark:bg-[radial-gradient(60%_50%_at_10%_0%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(50%_50%_at_100%_0%,rgba(59,130,246,0.10),transparent_50%),linear-gradient(to_bottom,#0b0b0b,transparent_30%)]"></div>

      <div className="max-w-7xl mx-auto p-6 text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <header className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white grid place-items-center shadow-sm">▦</div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Vito Media Client Health</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Live from Google Sheets — Clients • Monthly • Events • Contacts</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-40 md:w-72 relative">
                <input
                  value={q} onChange={e=>setQ(e.target.value)} placeholder="Search clients…"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔎</span>
              </div>

              {mounted && (
                <button
                  onClick={toggle}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm hover:shadow"
                  title="Toggle light/dark"
                >
                  <span className="hidden sm:inline">Theme</span>
                  <span className="text-lg">🌓</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* KPI row — only show relevant, with hover list */}
        {kpiData && (
          <section className="mt-6 flex flex-wrap gap-3">
            {kpiData.dueSoon.length>0 && (
              <Tooltip content={<ul className="text-sm list-disc pl-5">{kpiData.dueSoon.map((n,i)=><li key={i}>{n}</li>)}</ul>}>
                <span className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 px-3 py-2 text-sm shadow-sm">
                  <span className="font-semibold">{kpiData.dueSoon.length}</span> LQR Due Soon
                </span>
              </Tooltip>
            )}
            {kpiData.overdue.length>0 && (
              <Tooltip content={<ul className="text-sm list-disc pl-5">{kpiData.overdue.map((n,i)=><li key={i}>{n}</li>)}</ul>}>
                <span className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 px-3 py-2 text-sm shadow-sm">
                  <span className="font-semibold">{kpiData.overdue.length}</span> LQR Overdue
                </span>
              </Tooltip>
            )}
            {kpiData.comms7.length>0 && (
              <Tooltip content={<ul className="text-sm list-disc pl-5">{kpiData.comms7.map((n,i)=><li key={i}>{n}</li>)}</ul>}>
                <span className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 px-3 py-2 text-sm shadow-sm">
                  <span className="font-semibold">{kpiData.comms7.length}</span> Comms &gt; 7 Days
                </span>
              </Tooltip>
            )}
          </section>
        )}

        {/* Legend — Sent (green), Incomplete (yellow), Overdue (red), Other (grey) */}
        <section className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4">
          <div className="text-xs font-medium mb-2 text-zinc-600 dark:text-zinc-300">Legend</div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500"></span>Sent</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-400"></span>Incomplete</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500"></span>Overdue</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>Other</span>
          </div>
        </section>

        {/* Clients grid */}
        {!filtered ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i)=><div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 p-5 shadow-sm animate-pulse">
              <div className="h-14 w-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4"/>
              <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 mb-2"/>
              <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 mb-4"/>
              <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800"/>
            </div>)}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c,idx)=>{
              const slug=normalizeSlug(c.Slug);
              const website = c.Link || c.Website || null;

              // Team (sheet) with fallback to Clients names
              const teamLeads = (leadsBySlug[slug] || []);
              const teamAssists = (assistsBySlug[slug] || []);
              const fallbackLeads = !teamLeads.length ? splitNames(c["Client Lead"]).map(n => ({ Name:n })) : [];
              const fallbackAssists = !teamAssists.length ? splitNames(c["Client Assist"]).map(n => ({ Name:n })) : [];

              const lastLQR=lqrStatus(dateFromSheet(c["Last Quarterly Review"]));
              const commsType=c["Last Comms Type"];
              const commsDate=dateFromSheet(c["Last Comms Date"]);
              const commsPill=commsRecency(commsDate, commsType);

              // Month pills for current year
              const monthsForYear = (monthDataBySlug[slug]?.[currentYear]) || {};
              const monthPills = MONTHS_SHORT.map((label, i) => {
                const state = (monthsForYear[i] && monthsForYear[i].state) || null;
                const color = monthPillColor(state);
                return { label, color };
              });

              // Up to 3 upcoming items
              const upcoming=(eventsBySlug[slug] || []).filter(e=>e._date>=new Date()).slice(0,3);

              const cc = contactsBySlug[slug];
              const sc = scopeBySlug[slug];

              // Hover content merged (Scope + Client) on Logo
              const hoverContent = (
                <div className="text-sm space-y-2">
                  <div className="font-medium">{c.Client || slug}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="text-zinc-500">Posts / wk</div><div className="text-right font-medium">{sc?.posts||"—"}</div>
                    <div className="text-zinc-500">Blogs / mo</div><div className="text-right font-medium">{sc?.blogs||"—"}</div>
                    <div className="text-zinc-500">Meta ads</div><div className="text-right font-medium">{sc?.metaAds||"—"}</div>
                    <div className="text-zinc-500">Google ads</div><div className="text-right font-medium">{sc?.googleAds||"—"}</div>
                    <div className="text-zinc-500">Videos / mo</div><div className="text-right font-medium">{sc?.videos||"—"}</div>
                    <div className="text-zinc-500">Shorts / mo</div><div className="text-right font-medium">{sc?.shorts||"—"}</div>
                    <div className="text-zinc-500">Images / mo</div><div className="text-right font-medium">{sc?.images||"—"}</div>
                  </div>
                  {(sc?.notes || c["Comms Notes"]) && (
                    <div className="text-xs text-zinc-500">{sc?.notes || c["Comms Notes"]}</div>
                  )}
                  {(cc?.primary || cc?.secondary) && (
                    <div className="text-xs">
                      <div className="text-zinc-500 mb-1">Contacts</div>
                      <div className="space-y-1">
                        {cc?.primary && <div><span className="font-medium">Primary:</span> {cc.primary.Name} {cc.primary.Email? <a className="text-emerald-600 dark:text-emerald-400 hover:underline" href={`mailto:${cc.primary.Email}`}>({cc.primary.Email})</a> : null}</div>}
                        {cc?.secondary && <div><span className="font-medium">Secondary:</span> {cc.secondary.Name} {cc.secondary.Email? <a className="text-emerald-600 dark:text-emerald-400 hover:underline" href={`mailto:${cc.secondary.Email}`}>({cc.secondary.Email})</a> : null}</div>}
                      </div>
                    </div>
                  )}
                </div>
              );

              return (
                <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/70 p-5 shadow-sm hover:shadow-md transition">
                  {/* top */}
                  <div className="flex items-center gap-4">
                    <Tooltip content={hoverContent}>
                      <span className="inline-block">
                        {c.LogoFile ? (
                          <img src={`/logos/${c.LogoFile}`} alt={slug||"logo"} className="h-14 w-14 rounded-xl object-contain bg-white ring-1 ring-zinc-200 dark:ring-zinc-800"/>
                        ) : (
                          <div className="h-14 w-14 rounded-xl grid place-items-center bg-zinc-900 text-white font-semibold">
                            {(slug||"??").slice(0,3)}
                          </div>
                        )}
                      </span>
                    </Tooltip>

                    <div className="min-w-0">
                      <div className="text-lg font-semibold truncate">
                        {website ? (
                          <a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {c.Client || "—"}
                          </a>
                        ) : (c.Client || "—")}
                      </div>

                      {/* Team hover chips */}
                      <div className="mt-1 flex flex-col gap-1 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-zinc-500">Lead:</span>
                          <span className="flex gap-2 flex-wrap">
                            {( (leadsBySlug[slug]||[]).length ? leadsBySlug[slug] : splitNames(c["Client Lead"]).map(n=>({Name:n})) ).map((p,i)=>(<PersonBadge key={i} name={p.Name} person={teamByName[normalizeName(p.Name)] || p} />))}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-zinc-500">Assist:</span>
                          <span className="flex gap-2 flex-wrap">
                            {( (assistsBySlug[slug]||[]).length ? assistsBySlug[slug] : splitNames(c["Client Assist"]).map(n=>({Name:n})) ).map((p,i)=>(<PersonBadge key={i} name={p.Name} person={teamByName[normalizeName(p.Name)] || p} />))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* comms + LQR */}
                  <div className="mt-4 flex items-center gap-2 text-sm flex-wrap">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", commsPill.cls)}>{commsPill.label}</span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", lastLQR.cls)}>{lastLQR.label}</span>
                  </div>

                  {/* months */}
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">This year</div>
                    <div className="grid grid-cols-6 gap-2">
                      {monthPills.map((p,i)=><MonthPill key={i} label={p.label} color={p.color}/>)}
                    </div>
                  </div>

                  {/* Next (show up to 3) */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Next</div>
                    {upcoming.length ? (
                      <div className="space-y-1">
                        {upcoming.map((ev,i)=>(
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{ev.Event}</div>
                              <div className="text-zinc-500 truncate">{ev.Notes || ""}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-zinc-500">{fmt(ev._date)}</div>
                              <div className="mt-1"><StatusChip status={ev._statusByClient[slug] || ev._statusDefault || "no content organised or needed"}/></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500">No upcoming items</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Events table */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Major Upcoming Events, Holidays or Campaigns</h2>
          {!events ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 p-6 shadow-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/70 shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Clients</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev,i)=>(
                    <tr key={i} className={i%2 ? "bg-white/60 dark:bg-zinc-900/30":""}>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(ev._date)}</td>
                      <td className="px-4 py-3 font-medium">{ev.Event || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ev._slugs.map((s,idx)=>{
                            const st=ev._statusByClient[s] || ev._statusDefault || "no content organised or needed";
                            return (
                              <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-950">
                                {s} <StatusChip status={st}/>
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

        {/* Footer with Google Sheet link */}
        <footer className="mt-8 text-xs text-zinc-500">
          Last refreshed on page load. Update Google Sheets →
          {" "}
          {SHEET_URL ? (
            <a className="text-emerald-600 dark:text-emerald-400 hover:underline" href={SHEET_URL} target="_blank" rel="noopener noreferrer">refresh here</a>
          ) : (
            <span className="opacity-70">set NEXT_PUBLIC_SHEET_URL to enable “refresh here”</span>
          )}
          .
        </footer>
      </div>
    </main>
  );
}
