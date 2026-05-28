import { NextResponse } from "next/server";
export async function GET() {
  const raw = process.env.ADMIN_USERS ?? "NOT SET";
  const parsed = raw.split(",").map(e => {
    const parts = e.trim().split(":");
    return { email: parts[0], passwordLength: parts.slice(1).join(":").length };
  });
  return NextResponse.json({ raw_length: raw.length, parsed });
}
