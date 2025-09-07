// app/api/sheet/route.js
export const revalidate = 60; // cache on the server for 60s

function parseGvizJSON(raw) {
  // Response looks like: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Unexpected GViz response");
  const json = JSON.parse(raw.slice(start, end + 1));

  const cols = (json.table.cols || []).map((c, i) => c?.label || c?.id || `Column ${i + 1}`);
  const rows = (json.table.rows || []).map((r) =>
    (r.c || []).map((cell) => (cell && "v" in cell ? cell.v : ""))
  );

  const data = rows.map((row) => Object.fromEntries(cols.map((k, i) => [k, row[i] ?? ""])));
  return { columns: cols, rows: data };
}

export async function GET() {
  const url = process.env.SHEET_GVIZ_URL;
  if (!url) {
    return new Response(JSON.stringify({ error: "Missing SHEET_GVIZ_URL" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Fetch failed: ${res.status}` }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const text = await res.text();
  try {
    const parsed = parseGvizJSON(text);
    return new Response(JSON.stringify(parsed), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Parse error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
