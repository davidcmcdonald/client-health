export const runtime = "nodejs";
import { NextResponse } from "next/server";

function clearCookie(res) {
  res.cookies.set("vm_access", "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("logout")) {
    const res = NextResponse.redirect(new URL("/unlock?out=1", req.url), 303);
    return clearCookie(res);
  }
  // If someone GETs this endpoint, send them to /unlock
  return NextResponse.redirect(new URL("/unlock", req.url), 303);
}

export async function POST(req) {
  const url = new URL(req.url);

  // Support logout via POST too (your form uses POST)
  if (url.searchParams.get("logout")) {
    const res = NextResponse.redirect(new URL("/unlock?out=1", req.url), 303);
    return clearCookie(res);
  }

  // ---- Unlock flow ----
  const form = await req.formData();
  const code = String(form.get("code") || "").trim();
  const nextRaw = String(form.get("next") || "/");
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  const secret = process.env.PROTECT_PASSCODE ?? "";
  const ok = !!secret && code === secret;

  const dest = ok ? next : `/unlock?error=${!secret ? "noenv" : "bad"}`;
  const res = NextResponse.redirect(new URL(dest, req.url), 303); // PRG

  if (ok) {
    res.cookies.set("vm_access", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    clearCookie(res);
  }
  return res;
}
