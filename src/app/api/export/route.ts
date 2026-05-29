import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const days = parseInt(searchParams.get("days") ?? "90");

  const client = await pool.connect();
  try {
    // Get user ID
    const userRes = await client.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    if (!userRes.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    // Get AQ data
   const dataRes = await client.query(
      `SELECT * FROM air_quality_data
       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp DESC`,
      [userId]
    );

    if (!dataRes.rows.length) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    // Build CSV
    const headers = Object.keys(dataRes.rows[0]);
    const csv = [
      headers.join(","),
      ...dataRes.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const s = String(val);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      )
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="aira_aq_${email}_${days}days.csv"`,
      },
    });
  } finally {
    client.release();
  }
}
