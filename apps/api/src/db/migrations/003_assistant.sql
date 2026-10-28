create extension if not exists vector;

-- potion-base-8M is a static embedding model: one fixed vector per token.
-- Embedding a sentence is the average of its tokens' vectors, so the whole
-- model can live in this table and be applied with avg() in SQL.
create table token_embeddings (
  token_id integer primary key,
  embedding vector(256) not null
);

create table knowledge_chunks (
  id serial primary key,
  source text not null,
  heading text not null,
  content text not null,
  content_hash text not null unique,
  embedding vector(256) not null,
  search_text tsvector generated always as (
    setweight(to_tsvector('english', heading), 'A') || setweight(to_tsvector('english', content), 'B')
  ) stored
);

create index knowledge_chunks_embedding_idx on knowledge_chunks using hnsw (embedding vector_cosine_ops);
create index knowledge_chunks_search_idx on knowledge_chunks using gin (search_text);
