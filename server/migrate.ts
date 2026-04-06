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

    await client.query(`
      ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email text;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code text;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount numeric(10,2) DEFAULT 0;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        discount_type text NOT NULL DEFAULT 'percent',
        discount_value numeric(10,2) NOT NULL,
        min_order_amount numeric(10,2),
        max_uses integer,
        used_count integer DEFAULT 0,
        is_active boolean DEFAULT true,
        expires_at timestamp,
        description text,
        created_at timestamp DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_supplements (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        supplement_number serial UNIQUE,
        order_id varchar NOT NULL REFERENCES orders(id),
        shop_id varchar NOT NULL REFERENCES shops(id),
        amount numeric(10,2) NOT NULL,
        reason varchar(255) NOT NULL,
        description text,
        status varchar(20) NOT NULL DEFAULT 'pending',
        payment_id text,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    console.log("[migrate] Schema up to date");
  } catch (err) {
    console.error("[migrate] Migration error:", err);
  } finally {
    client.release();
  }
}
