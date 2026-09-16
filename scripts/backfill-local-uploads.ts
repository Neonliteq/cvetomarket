/**
 * One-off backfill: copy every uploaded object referenced by the database from
 * S3 into the server's local mirror (see server/localObjectStore.ts) so product
 * photos no longer depend on S3 being available.
 *
 * Usage (on the server, with .env loaded):
 *   set -a && . ./.env && set +a
 *   npx tsx scripts/backfill-local-uploads.ts
 */
import { Pool } from "pg";
import { ObjectStorageService } from "../server/replit_integrations/object_storage/objectStorage";
import {
  hasLocalObject,
  localNameForObjectPath,
  uploadsDir,
  writeLocalObject,
} from "../server/localObjectStore";

const CONCURRENCY = 4;

/** Scalar text columns that may hold an `/objects/...` URL. */
const SCALAR_SOURCES: Array<{ table: string; column: string }> = [
  { table: "users", column: "avatar_url" },
  { table: "shops", column: "logo_url" },
  { table: "shops", column: "cover_url" },
  { table: "orders", column: "assembly_photo_url" },
  { table: "order_items", column: "product_image" },
  { table: "messages", column: "image_url" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });
  const urls = new Set<string>();

  try {
    const arr = await pool.query(
      "select distinct unnest(images) as url from products where images is not null and array_length(images, 1) > 0",
    );
    for (const r of arr.rows) if (r.url) urls.add(r.url);

    for (const { table, column } of SCALAR_SOURCES) {
      try {
        const res = await pool.query(
          `select distinct ${column} as url from ${table} where ${column} like '/objects/%'`,
        );
        for (const r of res.rows) if (r.url) urls.add(r.url);
      } catch (err: any) {
        console.warn(`skip ${table}.${column}: ${err?.message ?? err}`);
      }
    }
  } finally {
    await pool.end();
  }

  const targets: Array<{ url: string; name: string }> = [];
  for (const url of urls) {
    const name = localNameForObjectPath(url);
    if (name) targets.push({ url, name });
  }

  console.log(`Local mirror dir: ${uploadsDir()}`);
  console.log(`Found ${targets.length} uploaded object(s) referenced by the DB.`);

  const service = new ObjectStorageService();
  let index = 0;
  let done = 0;
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (index < targets.length) {
      const target = targets[index++];
      done += 1;
      try {
        if (await hasLocalObject(target.name)) {
          skipped += 1;
        } else {
          const file = await service.getObjectEntityFile(target.url);
          const buf = await file.getBuffer();
          await writeLocalObject(target.name, buf);
          copied += 1;
        }
      } catch (err: any) {
        failed += 1;
        console.warn(`  ! ${target.url}: ${err?.message ?? err}`);
      }
      if (done % 25 === 0 || done === targets.length) {
        console.log(`  ${done}/${targets.length} (copied ${copied}, skipped ${skipped}, failed ${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Done. copied=${copied} skipped=${skipped} failed=${failed} total=${targets.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
