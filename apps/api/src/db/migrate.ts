import { readdir, readFile } from "node:fs/promises";
import { pool, withTransaction } from "../db.js";

const folder = new URL("./migrations/", import.meta.url);

export async function migrate(): Promise<void> {
  await pool.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await pool.query<{ name: string }>("select name from schema_migrations");
  const applied = new Set(rows.map((row) => row.name));

  const files = (await readdir(folder)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(new URL(file, folder), "utf8");
    await withTransaction(async (db) => {
      await db.query(sql);
      await db.query("insert into schema_migrations (name) values ($1)", [file]);
    });
    console.log(`Applied ${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await migrate();
  await pool.end();
}
