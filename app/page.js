"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sheet")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Sheet Viewer</h1>

      {error && <p className="text-red-600">Error: {error}</p>}
      {!error && !data && <p>Loading…</p>}

      {data && (
        <>
          <p className="mb-3 opacity-70">
            Rendering <strong>{data.rows.length}</strong> rows
          </p>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {data.columns.map((c) => (
                    <th key={c} className="text-left p-3 border-b border-gray-200 sticky top-0">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    {data.columns.map((c) => (
                      <td key={c} className="p-3 border-b border-gray-100">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
