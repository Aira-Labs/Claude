import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? "";
  const days = parseInt(searchParams.get("days") ?? "90");

  const client = await pool.connect();
  try {
    // Find user — try common email column names
    const userRes = await client.query(
      `SELECT id FROM users WHERE email = $1 OR email_address = $1 LIMIT 1`,
      [email]
    );

    let whereClause = "";
    const params: unknown[] = [];

    if (userRes.rows.length) {
      whereClause = `WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'`;
      params.push(userRes.rows[0].id);
    } else {
      // No user filter — just return recent data
      whereClause = `WHERE timestamp >= NOW() - INTERVAL '${days} days'`;
    }

    const dataRes = await client.query(
      `SELECT * FROM air_quality_data ${whereClause} ORDER BY timestamp DESC LIMIT 50000`,
      params
    );

    if (!dataRes.rows.length) {
      return new NextResponse("No data found", { status: 404 });
    }

    const headers = Object.keys(dataRes.rows[0]);
    const csv = [
      headers.join(","),
      ...dataRes.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const s = String(val);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      )
    ].join("\n");

    re
