export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST(req) {
  const form = await req.formData();
  const code = String(form.get("code") || "").trim();
  const nextRaw = String(form.get("next") || "/");
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  const secret = process.env.PROTECT_PASSCODE ?? "";
  const ok = !!secret && code === secret;

  const url = new URL(ok ? next : `/unlock?error=${!secret ? "noenv" : "bad"}`, req.url);
  const res = NextResponse.redirect(url, 303); // PRG: force GET

  if (ok) {
    res.cookies.set("vm_access", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    res.cookies.set("vm_access", "", { path: "/", maxAge: 0 });
  }
  return res;
}
