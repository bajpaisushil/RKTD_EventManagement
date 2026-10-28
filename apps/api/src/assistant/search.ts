import { pool } from "../db.js";
import { tokenIds } from "./tokenizer.js";

export type KnowledgeHit = {
  id: number;
  source: string;
  heading: string;
  content: string;
  score: number;
};

export type SearchMode = "hybrid" | "vector" | "keyword";

type Candidate = Omit<KnowledgeHit, "score"> & { vector_rank: number | null; keyword_rank: number | null };

// Finds the best 20 chunks by meaning (pgvector, cosine distance) and the best 20 by
// words (Postgres full-text search, any word may match). The question's embedding is
// the average of its token vectors, worked out inside the same query.
const CANDIDATES = `
  with question as (
    select avg(t.embedding) as embedding
    from unnest($1::int[]) as q(token_id)
    join token_embeddings t using (token_id)
  ),
  by_meaning as (
    select c.id, row_number() over (order by c.embedding <=> question.embedding) as rank
    from knowledge_chunks c, question
    where question.embedding is not null
    order by c.embedding <=> question.embedding
    limit 20
  ),
  by_words as (
    select c.id, row_number() over (order by ts_rank_cd(c.search_text, words) desc) as rank
    from knowledge_chunks c,
         to_tsquery('english', replace(plainto_tsquery('english', $2)::text, '&', '|')) as words
    where c.search_text @@ words
    order by ts_rank_cd(c.search_text, words) desc
    limit 20
  )
  select c.id, c.source, c.heading, c.content, m.rank::int as vector_rank, w.rank::int as keyword_rank
  from knowledge_chunks c
  left join by_meaning m on m.id = c.id
  left join by_words w on w.id = c.id
  where m.id is not null or w.id is not null`;

// Reciprocal rank fusion: a chunk near the top of either list scores well, and one
// near the top of both scores best. 60 is the usual damping constant.
function fusedScore(candidate: Candidate, mode: SearchMode): number {
  const score = (rank: number | null) => (rank === null ? 0 : 1 / (60 + rank));
  if (mode === "vector") return score(candidate.vector_rank);
  if (mode === "keyword") return score(candidate.keyword_rank);
  return score(candidate.vector_rank) + score(candidate.keyword_rank);
}

export async function searchKnowledge(question: string, options: { limit?: number; mode?: SearchMode } = {}): Promise<KnowledgeHit[]> {
  const { limit = 4, mode = "hybrid" } = options;
  const { rows } = await pool.query<Candidate>(CANDIDATES, [await tokenIds(question), question]);
  return rows
    .map((candidate) => {
      const { vector_rank, keyword_rank, ...chunk } = candidate;
      return { ...chunk, score: fusedScore(candidate, mode) };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
