import { Pool } from "pg";

declare global { var _pgPool: Pool | undefined; }

const pool: Pool = global._pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 5,
});
if (process.env.NODE_ENV !== "production") global._pgPool = pool;

export async function queryDb(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    return { columns: result.fields.map(f => f.name), rows: result.rows };
  } finally {
    client.release();
  }
}

export async function getSchema(): Promise<string> {
  try {
    const { rows } = await queryDb(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const tables: Record<string, string[]> = {};
    for (const row of rows) {
      const t = row.table_name as string;
      if (!tables[t]) tables[t] = [];
      tables[t].push(`  ${row.column_name} ${row.data_type}`);
    }
    return Object.entries(tables).map(([n, cols]) => `TABLE ${n}(\n${cols.join(",\n")}\n)`).join("\n\n");
  } catch {
    return "(schema unavailable)";
  }
}
