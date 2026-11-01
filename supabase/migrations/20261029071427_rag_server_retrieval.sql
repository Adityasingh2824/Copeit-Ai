-- Only the service-role Edge Function may invoke semantic retrieval.
grant usage on schema copeit_private to service_role;
grant select on copeit_private.chunk_embeddings to service_role;

create or replace function public.search_approved_chunks(
  p_tenant_id uuid,
  p_query text,
  p_query_embedding extensions.vector(768),
  p_limit integer default 8,
  p_product_id uuid default null
)
returns table (
  chunk_id uuid,
  source_id uuid,
  title text,
  version_label text,
  canonical_url text,
  page_start integer,
  page_end integer,
  heading_path text[],
  content text,
  vector_similarity real,
  hybrid_score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select c.id as chunk_id, s.id as source_id, s.title, dv.version_label, s.canonical_url,
      c.page_start, c.page_end, c.heading_path, c.content,
      1 - (e.embedding OPERATOR(extensions.<=>) p_query_embedding) as vector_similarity,
      ts_rank_cd(to_tsvector('english', c.content), websearch_to_tsquery('english', p_query)) as text_rank
    from public.document_chunks c
    join copeit_private.chunk_embeddings e on e.chunk_id = c.id and e.tenant_id = c.tenant_id
    join public.document_versions dv on dv.id = c.document_version_id and dv.tenant_id = c.tenant_id
    join public.sources s on s.id = dv.source_id and s.tenant_id = dv.tenant_id
    join public.source_reviews r on r.document_version_id = dv.id and r.tenant_id = dv.tenant_id and r.status = 'approved'
    where c.tenant_id = p_tenant_id
      and (p_product_id is null or s.product_id is null or s.product_id = p_product_id)
  )
  select chunk_id, source_id, title, version_label, canonical_url, page_start, page_end, heading_path, content,
    vector_similarity::real,
    (0.75 * vector_similarity + 0.25 * least(text_rank, 1))::real as hybrid_score
  from eligible
  order by (0.75 * vector_similarity + 0.25 * least(text_rank, 1)) desc
  limit least(greatest(p_limit, 1), 12);
$$;
revoke all on function public.search_approved_chunks(uuid, text, extensions.vector, integer, uuid) from public, anon, authenticated;
grant execute on function public.search_approved_chunks(uuid, text, extensions.vector, integer, uuid) to service_role;
