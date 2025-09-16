// app/api/unlock/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const form = await req.formData();
  const code = String(form.get("code") || "").trim();
  const next = String(form.get("next") || "/");

  const ok = code && code === process.env.PROTECT_PASSCODE;

  // Build redirect target (stay on /unlock with ?error=1 if wrong)
  const target = ok ? (next.startsWith("/") ? next : "/") : "/unlock?error=1";
  const res = NextResponse.redirect(new URL(target, req.url));

  if (ok) {
    res.cookies.set("vm_access", "1", {
      httpOnly: true,           // JS can't read it (safer)
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
  }

  return res;
}
