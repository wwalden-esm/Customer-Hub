import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export default auth((req) => {
  const { nextUrl } = req;
  const isEsmRoute = nextUrl.pathname.startsWith("/dashboard");
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isLoggedIn = !!req.auth;

  if (isApiRoute) {
    const clientIp = req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || "unknown";
    const { allowed, remaining } = rateLimit(`api:${clientIp}`, 120, 60_000);
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        },
      });
    }
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  if (isEsmRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("from", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
