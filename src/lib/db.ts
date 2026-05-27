import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

// Reuse pool across hot-reloads in dev
export const pool: Pool = global._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") global._pgPool = pool;

export async function queryDb(
  sql: string,
  params?: unknown[]
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return {
      columns: result.fields.map((f) => f.name),
      rows: result.rows,
    };
  } finally {
    client.release();
  }
}

// Fetch table schema for Claude context
export async function getSchema(): Promise<string> {
  const { rows } = await queryDb(`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const tables: Record<string, string[]> = {};
  for (const row of rows) {
    const t = row.table_name as string;
    if (!tables[t]) tables[t] = [];
    tables[t].push(
      `  ${row.column_name} ${row.data_type}${row.is_nullable === "NO" ? " NOT NULL" : ""}`
    );
  }

  return Object.entries(tables)
    .map(([name, cols]) => `TABLE ${name}(\n${cols.join(",\n")}\n)`)
    .join("\n\n");
}
