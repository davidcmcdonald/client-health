import { NextResponse } from "next/server";

/** Parse GViz wrapper and promote header row when GViz returns A,B,C... */
function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("GViz: malformed response");
  const obj = JSON.parse(text.slice(start, end + 1));
  const table = obj.table ?? {};
  let columns = (table.cols || []).map(c => (c.label ?? c.id ?? "") + "");
  let rows = (table.rows || []).map(r => (r.c || []).map(c => (c ? c.v : null)));

  // If labels are generic (A,B,C,…) and first row looks like real headers, promote it.
  const generic = columns.length && columns.every(x => !x || /^[A-Z]+$/.test(x.trim()));
  if (generic && rows.length) {
    const headerRow = rows[0].map(v => (v == null ? "" : String(v)));
    const nonEmpty = headerRow.filter(s => s.trim()).length;
    if (nonEmpty >= Math.max(1, Math.floor(headerRow.length / 2))) {
      columns = headerRow.map(s => s.trim());
      rows = rows.slice(1);
    }
  }

  // Drop fully empty rows
  rows = rows.filter(r => r.some(v => v != null && String(v).trim() !== ""));
  return { columns, rows };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get("sheet") || "Clients";

    // Prefer SHEET_GVIZ_URL_BASE; fall back to SHEET_GVIZ_URL (strip any &sheet=…)
    let base =
      process.env.SHEET_GVIZ_URL_BASE ||
      (process.env.SHEET_GVIZ_URL || "").replace(/([?&])sheet=[^&]*/i, "$1").replace(/[?&]$/, "");

    if (!base) {
      return NextResponse.json({ error: "Missing SHEET_GVIZ_URL_BASE" }, { status: 500 });
    }

    // Ensure base has out:json and explicitly request row 1 as headers
    if (!/[?&]tqx=out:json/i.test(base)) {
      base += (base.includes("?") ? "&" : "?") + "tqx=out:json";
    }
    const url = `${base}${base.includes("?") ? "&" : "?"}sheet=${encodeURIComponent(sheetName)}&headers=1`;

    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json({ error: `GViz fetch failed: ${res.status}` }, { status: res.status });
    }

    const text = await res.text();
    const { columns, rows } = parseGviz(text);
    return NextResponse.json({ columns, rows, sheet: sheetName });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
