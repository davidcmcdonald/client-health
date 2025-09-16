// app/api/unlock/route.js
export const runtime = "nodejs"; // ensure Node runtime

import { NextResponse } from "next/server";

export async function POST(req) {
  const form = await req.formData();
  const code = String(form.get("code") || "").trim();
  const next = String(form.get("next") || "/");

  const secret = process.env.PROTECT_PASSCODE;
  const ok = !!secret && code === secret;

  // Build redirect (preserve where they were going)
  const target = ok
    ? (next.startsWith("/") ? next : "/")
    : `/unlock?error=${!secret ? "noenv" : "bad"}`;

  const res = NextResponse.redirect(new URL(target, req.url));

  if (ok) {
    res.cookies.set("vm_access", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return res;
}
