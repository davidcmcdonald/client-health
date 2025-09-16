// app/api/logout/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const res = NextResponse.redirect(new URL("/unlock", req.url));
  // clear the cookie
  res.cookies.set("vm_access", "", { path: "/", maxAge: 0 });
  return res;
}
