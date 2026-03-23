import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_city text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id text;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id),
        type varchar NOT NULL,
        title varchar NOT NULL,
        text text,
        link varchar,
        is_read boolean DEFAULT false,
        created_at timestamp DEFAULT now()
      );
    `);

    await client.query(`
      INSERT INTO cities (name)
      VALUES ('Калининград и область')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes text;
    `);

    console.log("[migrate] Schema up to date");
  } catch (err) {
    console.error("[migrate] Migration error:", err);
  } finally {
    client.release();
  }
}
