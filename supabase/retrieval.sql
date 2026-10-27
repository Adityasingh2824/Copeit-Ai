-- Copeit AI reviewed-source retrieval foundation. Apply after schema.sql.
create extension if not exists vector with schema extensions;

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid, title text not null check (length(trim(title)) between 2 and 300), version_label text not null,
  source_url text, authority text not null default '', jurisdiction text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft','approved','rejected','superseded')),
  allowed_roles text[] not null default array['owner','admin','lead','editor','reviewer','viewer']::text[],
  effective_at date, expires_at date, approved_by uuid references auth.users(id), approved_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id), unique (tenant_id, id),
  check ((review_status = 'approved') = (approved_by is not null and approved_at is not null)),
  check (allowed_roles <@ array['owner','admin','lead','editor','reviewer','viewer']::text[])
);
create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, document_id uuid not null,
  chunk_index integer not null check (chunk_index >= 0), content text not null check (length(trim(content)) between 1 and 12000),
  page_label text, section_label text, embedding extensions.vector(768), embedding_model text not null default 'gemini-embedding-2',
  search_vector tsvector generated always as (to_tsvector('english', content)) stored, created_at timestamptz not null default now(),
  foreign key (tenant_id, document_id) references public.source_documents(tenant_id, id) on delete cascade,
  unique (document_id, chunk_index)
);
create index if not exists source_documents_tenant_review_idx on public.source_documents(tenant_id, review_status);
create index if not exists source_chunks_tenant_idx on public.source_chunks(tenant_id);
create index if not exists source_chunks_fts_idx on public.source_chunks using gin(search_vector);
create index if not exists source_chunks_embedding_idx on public.source_chunks using hnsw (embedding extensions.vector_cosine_ops);
alter table public.source_documents enable row level security;
alter table public.source_chunks enable row level security;
revoke all on public.source_documents, public.source_chunks from anon, authenticated;
grant select on public.source_documents, public.source_chunks to authenticated;
create policy source_documents_select on public.source_documents for select to authenticated using (exists (
  select 1 from public.memberships m where m.tenant_id = source_documents.tenant_id
    and m.user_id = (select auth.uid()) and m.role = any(source_documents.allowed_roles)
));
create policy source_chunks_select on public.source_chunks for select to authenticated using (exists (
  select 1 from public.source_documents d join public.memberships m on m.tenant_id = d.tenant_id
  where d.id = source_chunks.document_id and d.tenant_id = source_chunks.tenant_id
    and m.user_id = (select auth.uid()) and m.role = any(d.allowed_roles)
));

-- Reciprocal-rank fusion combines lexical and vector ranks without comparing unlike scores.
create or replace function public.hybrid_search_source_chunks(
  p_tenant_id uuid, p_query text, p_query_embedding extensions.vector(768), p_limit integer default 8, p_product_id uuid default null
) returns table (chunk_id uuid, document_id uuid, title text, version_label text, source_url text, authority text,
  page_label text, section_label text, content text, vector_similarity double precision, hybrid_score double precision)
language sql stable security invoker set search_path = '' as $$
  with eligible as (
    select c.*, d.title, d.version_label, d.source_url, d.authority from public.source_chunks c
    join public.source_documents d on d.id = c.document_id and d.tenant_id = c.tenant_id
    where c.tenant_id = p_tenant_id and d.review_status = 'approved'
      and (d.effective_at is null or d.effective_at <= current_date) and (d.expires_at is null or d.expires_at >= current_date)
      and (p_product_id is null or d.product_id is null or d.product_id = p_product_id) and c.embedding is not null
  ), vector_ranked as (
    select id, row_number() over (order by embedding <=> p_query_embedding) rank, 1 - (embedding <=> p_query_embedding) similarity
    from eligible order by embedding <=> p_query_embedding limit least(greatest(p_limit * 4, 20), 100)
  ), lexical_ranked as (
    select id, row_number() over (order by ts_rank_cd(search_vector, websearch_to_tsquery('english', p_query)) desc) rank
    from eligible where search_vector @@ websearch_to_tsquery('english', p_query)
    order by ts_rank_cd(search_vector, websearch_to_tsquery('english', p_query)) desc limit least(greatest(p_limit * 4, 20), 100)
  ), fused as (
    select coalesce(v.id,l.id) id, v.similarity,
      coalesce(1.0/(60+v.rank),0)*0.65 + coalesce(1.0/(60+l.rank),0)*0.35 score
    from vector_ranked v full join lexical_ranked l using (id)
  )
  select e.id,e.document_id,e.title,e.version_label,e.source_url,e.authority,e.page_label,e.section_label,e.content,f.similarity,f.score
  from fused f join eligible e on e.id=f.id order by f.score desc,f.similarity desc nulls last
  limit least(greatest(p_limit,1),20);
$$;
revoke all on function public.hybrid_search_source_chunks(uuid,text,extensions.vector,integer,uuid) from public, anon;
grant execute on function public.hybrid_search_source_chunks(uuid,text,extensions.vector,integer,uuid) to authenticated;
