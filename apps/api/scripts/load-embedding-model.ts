// One-off setup: loads the potion-base-8M static embedding model into Postgres.
// The tokenizer goes in embedding_tokenizer and one vector per token goes in
// token_embeddings, so the deployed API needs no model files at all.
//   pnpm --filter @rktd/api assistant:model
// On a slow connection, download model.safetensors yourself and pass MODEL_FILE=path.

import { readFile } from "node:fs/promises";
import { pool } from "../src/db.js";

const MODEL = "minishlab/potion-base-8M";
const REVISION = "bf8b056651a2c21b8d2565580b8569da283cab23";
const baseUrl = `https://huggingface.co/${MODEL}/resolve/${REVISION}`;

async function download(file: string): Promise<Buffer> {
  const response = await fetch(`${baseUrl}/${file}`);
  if (!response.ok) throw new Error(`Couldn't download ${file}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const tokenizer = JSON.parse((await download("tokenizer.json")).toString("utf8"));
const tokenizerConfig = JSON.parse((await download("tokenizer_config.json")).toString("utf8"));
await pool.query(
  `insert into embedding_tokenizer (id, model, tokenizer, tokenizer_config) values (1, $1, $2, $3)
   on conflict (id) do update set model = excluded.model, tokenizer = excluded.tokenizer, tokenizer_config = excluded.tokenizer_config`,
  [`${MODEL}@${REVISION}`, tokenizer, tokenizerConfig],
);
console.log("Saved tokenizer");

// safetensors: an 8-byte header length, a JSON header, then the raw float32 weights.
const model = process.env.MODEL_FILE ? await readFile(process.env.MODEL_FILE) : await download("model.safetensors");
const headerLength = Number(model.readBigUInt64LE(0));
const { embeddings } = JSON.parse(model.subarray(8, 8 + headerLength).toString("utf8"));
const [tokenCount, dims] = embeddings.shape;
const weights = model.subarray(8 + headerLength + embeddings.data_offsets[0], 8 + headerLength + embeddings.data_offsets[1]);
const vectors = new Float32Array(weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength));

await pool.query("truncate token_embeddings");
const batchSize = 500;
for (let first = 0; first < tokenCount; first += batchSize) {
  const ids: number[] = [];
  const literals: string[] = [];
  for (let token = first; token < Math.min(first + batchSize, tokenCount); token++) {
    ids.push(token);
    literals.push(`[${Array.from(vectors.subarray(token * dims, (token + 1) * dims)).join(",")}]`);
  }
  await pool.query("insert into token_embeddings (token_id, embedding) select * from unnest($1::int[], $2::vector[])", [ids, literals]);
  process.stdout.write(`\rLoaded ${Math.min(first + batchSize, tokenCount)} of ${tokenCount} tokens`);
}
console.log(`\nDone: ${tokenCount} token vectors with ${dims} dimensions.`);
await pool.end();
