// app/unlock/page.js
export const dynamic = "force-dynamic";

export default function Unlock({ searchParams }) {
  const error = searchParams?.error;
  const next = searchParams?.next || "/";

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form
        method="POST"
        action="/api/unlock"
        className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">Enter Passcode</h1>
        <input type="hidden" name="next" value={next} />
        <input
          name="code"
          type="password"
          placeholder="Team passcode"
          autoFocus
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {error && (
          <div className="text-sm text-rose-600">Incorrect passcode. Try again.</div>
        )}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700"
        >
          Unlock
        </button>
        <p className="text-xs text-zinc-500">
          Access is remembered for 30 days on this device.
        </p>
      </form>
    </main>
  );
}
