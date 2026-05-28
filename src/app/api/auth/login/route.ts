import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me"
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const raw = process.env.ADMIN_USERS ?? "";
    const users: Record<string, string> = {};
    for (const entry of raw.split(",")) {
      const colonIdx = entry.indexOf(":");
      if (colonIdx === -1) continue;
      const e = entry.slice(0, colonIdx).trim().toLowerCase();
      const p = entry.slice(colonIdx + 1).trim();
      users[e] = p;
    }

    const key = (email ?? "").toLowerCase().trim();
    const pass = password ?? "";

    if (!users[key] || users[key] !== pass) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({ email: key })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(SECRET);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "aira-session",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
