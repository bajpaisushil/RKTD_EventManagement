create table embedding_tokenizer (
  id integer primary key default 1 check (id = 1),
  model text not null,
  tokenizer jsonb not null,
  tokenizer_config jsonb not null
);
