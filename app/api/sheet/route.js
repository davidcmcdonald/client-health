import { NextResponse } from "next/server";

function parseGviz(jsonText) {
  // Strip GViz wrapper: /*O_o*/ google.visualization.Query.setResponse({...});
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  const obj = JSON.parse(jsonText.slice(start, end + 1));
  const table = obj.table;

  const columns = table.cols.map((c) => c.label || c.id || "");
  const rows = table.rows.map((r) => r.c.map((cell) => (cell ? cell.v : null)));

  return { columns, rows };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get("sheet") || "Clients";
    const base = process.env.SHEET_GVIZ_URL_BASE;
    if (!base) {
      return NextResponse.json({ error: "Missing SHEET_GVIZ_URL_BASE" }, { status: 500 });
    }

    const url = `${base}&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url, { cache: "no-store" });
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
