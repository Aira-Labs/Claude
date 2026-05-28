import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  const token = req.cookies.get("aira-session")?.value;
  let isLoggedIn = false;
  if (token) {
    try { await jwtVerify(token, SECRET); isLoggedIn = true; } catch {}
  }
  if (!isLoggedIn && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (isLoggedIn && pathname === "/login") return NextResponse.redirect(new URL("/chat", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
