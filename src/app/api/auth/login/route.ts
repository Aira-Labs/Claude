import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

function getAdminUsers(): Record<string, string> {
  const raw = process.env.ADMIN_USERS ?? "";
  return Object.fromEntries(
    raw.split(",")
      .map((entry) => entry.trim().split(":"))
      .filter((parts) => parts.length >= 2)
      .map(([email, ...rest]) => [email.trim().toLowerCase(), rest.join(":").trim()])
  );
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const admins = getAdminUsers();
  const key = email?.toLowerCase().trim();
  if (!key || !password || admins[key] !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await new SignJWT({ email: key, name: key.split("@")[0] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
  const res = NextResponse.json({ ok: true });
res.cookies.set("aira-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
