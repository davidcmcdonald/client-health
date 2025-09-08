import { NextResponse } from "next/server";

/**
 * Parse the raw GViz response string.
 * Returns { columns: string[], rows: any[][], table }.
 */
function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("GViz: could not find JSON boundaries");
  }
  const obj = JSON.parse(text.slice(start, end + 1));
  const table = obj.table;

  // initial labels (may be '', 'A', 'B', 'C', etc.)
  let columns = (table.cols || []).map((c) => (c.label ?? c.id ?? ""));

  // materialize rows as primitive values (null if missing)
  let rows = (table.rows || []).map((r) => (r.c || []).map((cell) => (cell ? cell.v : null)));

  // Detect and promote header row if labels are generic or empty.
  const allGeneric = columns.length > 0 && columns.every((lab) => {
    if (!lab || /^\s*$/.test(lab)) return true;
    return /^[A-Z]+$/.test(lab.trim()); // 'A','B','C' etc.
  });

  if (allGeneric && rows.length > 0) {
    const candidate = rows[0].map((v) => (v == null ? "" : String(v)));
    const nonEmptyStrings = candidate.filter((s) => typeof s === "string" && s.trim().length > 0).length;
    if (nonEmptyStrings >= Math.max(1, Math.floor(candidate.length / 2))) {
      columns = candidate;
      rows = rows.slice(1);
    }
  }

  // Trim and normalise column labels
  columns = columns.map((s) => (s == null ? "" : String(s).trim()));

  // Drop fully empty rows
  rows = rows.filter((r) => r.some((v) => v !== null && String(v).trim() !== ""));

  return { columns, rows, table };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get("sheet") || "Clients";

    let base =
      process.env.SHEET_GVIZ_URL_BASE ||
      (process.env.SHEET_GVIZ_URL || "").replace(/([?&])sheet=[^&]*/i, "$1").replace(/[?&]$/, "");

    if (!base) {
      return NextResponse.json({ error: "Missing SHEET_GVIZ_URL_BASE" }, { status: 500 });
    }

    // Ensure base has ?tqx=out:json
    if (!/[?&]tqx=out:json/i.test(base)) {
      base += (base.includes("?") ? "&" : "?") + "tqx=out:json";
    }

    const url = `${base}${base.includes("?") ? "&" : "?"}sheet=${encodeURIComponent(sheetName)}`;

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
