// app/api/sheet/route.js
import { NextResponse } from "next/server";

// Never cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Robust GViz parser that tolerates headerless sheets and empty rows */
function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("GViz: malformed response");
  const obj = JSON.parse(text.slice(start, end + 1));
  const table = obj.table ?? {};

  // c.f contains the formatted string, c.v contains the raw value; prefer formatted
  const getVal = (c) => (c && (c.f ?? c.v)) ?? null;

  let columns = (table.cols || []).map((c) => (c.label ?? c.id ?? "") + "");
  let rows = (table.rows || []).map((r) => (r.c || []).map(getVal));

  // Detect generic A,B,C... labels; if so, promote first row to headers
  const generic = columns.length && columns.every((x) => !x || /^[A-Z]+$/.test(x.trim()));
  let promoted = false;

  if (generic && rows.length) {
    const headerRow = rows[0].map((v) => (v == null ? "" : String(v)));
    const nonEmpty = headerRow.filter((s) => s.trim()).length;
    if (nonEmpty >= Math.max(1, Math.floor(headerRow.length / 2))) {
      columns = headerRow.map((s) => s.trim());
      rows = rows.slice(1);
      promoted = true;
    }
  }

  // Drop fully empty rows
  rows = rows.filter((r) => r.some((v) => v != null && String(v).trim() !== ""));

  return { columns, rows, promoted, generic };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get("sheet") || "Clients";
    const debug = searchParams.get("debug") === "1";

    // Prefer BASE var; fall back to SHEET_GVIZ_URL and strip any &sheet=...
    let base =
      process.env.SHEET_GVIZ_URL_BASE ||
      (process.env.SHEET_GVIZ_URL || "")
        .replace(/([?&])sheet=[^&]*/i, "$1")
        .replace(/[?&]$/, "");

    if (!base) {
      return NextResponse.json({ error: "Missing SHEET_GVIZ_URL_BASE or SHEET_GVIZ_URL" }, { status: 500 });
    }

    // Ensure out:json; add &sheet=...&headers=1
    if (!/[?&]tqx=out:json/i.test(base)) {
      base += (base.includes("?") ? "&" : "?") + "tqx=out:json";
    }
    const url = `${base}${base.includes("?") ? "&" : "?"}sheet=${encodeURIComponent(sheetName)}&headers=1`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `GViz fetch failed: ${res.status}` }, { status: res.status });
    }

    const text = await res.text();
    const parsed = parseGviz(text);

    if (debug) {
      return NextResponse.json({
        sheet: sheetName,
        columns: parsed.columns,
        rowsPreview: parsed.rows.slice(0, 3),
        debug: {
          envVarUsed: process.env.SHEET_GVIZ_URL_BASE ? "SHEET_GVIZ_URL_BASE" : (process.env.SHEET_GVIZ_URL ? "SHEET_GVIZ_URL" : "none"),
          url,
          genericDetected: parsed.generic,
          promotedHeaderRow: parsed.promoted,
        },
      });
    }

    return NextResponse.json({ columns: parsed.columns, rows: parsed.rows, sheet: sheetName });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
