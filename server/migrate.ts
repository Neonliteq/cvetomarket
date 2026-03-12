import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_city text;
    `);

    await client.query(`
      INSERT INTO cities (name)
      VALUES ('Калининград и область')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log("[migrate] Schema up to date");
  } catch (err) {
    console.error("[migrate] Migration error:", err);
  } finally {
    client.release();
  }
}
