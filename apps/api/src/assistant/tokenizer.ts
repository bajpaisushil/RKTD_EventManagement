import { Tokenizer } from "@huggingface/tokenizers";
import { pool } from "../db.js";

type TokenizerRow = {
  tokenizer: { model: { unk_token: string; vocab: Record<string, number> } };
  tokenizer_config: object;
};

type Loaded = { tokenizer: Tokenizer; unknownTokenId: number | undefined };

const MAX_TOKENS = 512;
let loading: Promise<Loaded> | null = null;

function load(): Promise<Loaded> {
  loading ??= pool
    .query<TokenizerRow>("select tokenizer, tokenizer_config from embedding_tokenizer where id = 1")
    .then(({ rows }) => {
      const row = rows[0];
      if (!row) throw new Error("The embedding model isn't loaded. Run: pnpm --filter @rktd/api assistant:model");
      return {
        tokenizer: new Tokenizer(row.tokenizer, row.tokenizer_config),
        unknownTokenId: row.tokenizer.model.vocab[row.tokenizer.model.unk_token],
      };
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}

// The same steps Model2Vec takes: no [CLS]/[SEP], unknown tokens dropped, at most 512 tokens.
export async function tokenIds(text: string): Promise<number[]> {
  const { tokenizer, unknownTokenId } = await load();
  const ids: number[] = tokenizer.encode(text, { add_special_tokens: false }).ids;
  return ids.filter((id) => id !== unknownTokenId).slice(0, MAX_TOKENS);
}
