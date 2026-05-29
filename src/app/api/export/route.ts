// @ts-nocheck
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
    const userRes = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    let rows;
    if (userRes.rows.length) {
      const userId = userRes.rows[0].id;
      const dataRes = await client.query(
        `SELECT * FROM air_quality_data WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days' ORDER BY created_at DESC LIMIT 50000`,
        [userId]
      );
      rows = dataRes.rows;
    } else {
      const dataRes = await client.query(
        `SELECT * FROM air_quality_data WHERE timestamp >= NOW() - INTERVAL '${days} days' ORDER BY timestamp DESC LIMIT 50000`
      );
      rows = dataRes.rows;
    }

    if (!rows.length) {
      return new NextResponse("No data found", { status: 404 });
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const s = String(val);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      )
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="aira_export_${days}days.csv"`,
      },
    });
  } catch (e) {
    return new NextResponse(`Error: ${String(e)}`, { status: 500 });
  } finally {
    client.release();
  }
}
