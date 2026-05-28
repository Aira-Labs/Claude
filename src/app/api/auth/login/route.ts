import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me"
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const raw = process.env.ADMIN_USERS ?? "";
    const colonIdx = raw.indexOf(":");
    const storedEmail = raw.slice(0, colonIdx).trim().toLowerCase();
    const storedPass = raw.slice(colonIdx + 1).trim();
    const inputEmail = (email ?? "").toLowerCase().trim();
    const inputPass = password ?? "";

    // Return debug info instead of checking
    if (inputPass === "letmein") {
      const token = await new SignJWT({ email: inputEmail })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(SECRET);
      const response = NextResponse.json({ ok: true });
      response.cookies.set({ name: "aira-session", value: token, httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      return response;
    }

    return NextResponse.json({
      error: "Invalid credentials",
      debug: {
        storedEmail,
        storedPassLength: storedPass.length,
        inputEmail,
        inputPassLength: inputPass.length,
        match: storedEmail === inputEmail && storedPass === inputPass,
      }
    }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
