// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow public assets and the unlock endpoints through
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/unlock") ||
+   pathname.startsWith("/api/logout") ||
    pathname.startsWith("/logos")
  ) {
    return NextResponse.next();
  }


  // Check cookie
  const hasCookie = req.cookies.get("vm_access")?.value === "1";
  if (hasCookie) return NextResponse.next();

  // Redirect to /unlock and preserve the original destination
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("next", pathname + (searchParams?.toString() ? `?${searchParams}` : ""));
  return NextResponse.redirect(url);
}

// Run on everything except the obvious static bits (double-safety)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
