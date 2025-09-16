import { NextResponse } from "next/server";

export async function POST(req) {
  const res = NextResponse.redirect(new URL("/unlock", req.url), 303); // PRG
  res.cookies.set("vm_access", "", { path: "/", maxAge: 0 });
  return res;
}
