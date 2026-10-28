// Splits the festival guide into one chunk per "## " section, embeds each chunk
// with the same SQL average the search uses, and stores it. Unchanged chunks are
// skipped and deleted sections are removed, so it's safe to run again after edits.
//   pnpm --filter @rktd/api assistant:ingest

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { pool } from "../db.js";
import { tokenIds } from "./tokenizer.js";

const folder = new URL("./knowledge/", import.meta.url);

type Chunk = { source: string; heading: string; content: string };

function chunksOf(markdown: string, source: string): Chunk[] {
  const title = /^# (.+)$/m.exec(markdown)?.[1] ?? source;
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [heading, ...body] = section.split("\n");
      return { source, heading: `${title}: ${heading.trim()}`, content: body.join("\n").trim() };
    });
}

const files = (await readdir(folder)).filter((file) => file.endsWith(".md")).sort();
const chunks = (await Promise.all(files.map(async (file) => chunksOf(await readFile(new URL(file, folder), "utf8"), file)))).flat();

const hashes: string[] = [];
let added = 0;
for (const chunk of chunks) {
  const hash = createHash("sha256").update(`${chunk.source}\n${chunk.heading}\n${chunk.content}`).digest("hex");
  hashes.push(hash);
  const { rowCount } = await pool.query(
    `insert into knowledge_chunks (source, heading, content, content_hash, embedding)
     select $1, $2, $3, $4, avg(t.embedding)
     from unnest($5::int[]) as q(token_id)
     join token_embeddings t using (token_id)
     on conflict (content_hash) do nothing`,
    [chunk.source, chunk.heading, chunk.content, hash, await tokenIds(`${chunk.heading}\n${chunk.content}`)],
  );
  added += rowCount ?? 0;
}
const { rowCount: removed } = await pool.query("delete from knowledge_chunks where content_hash <> all($1)", [hashes]);

console.log(`${chunks.length} chunks from ${files.length} files: ${added} added, ${removed ?? 0} removed, ${chunks.length - added} unchanged.`);
await pool.end();
