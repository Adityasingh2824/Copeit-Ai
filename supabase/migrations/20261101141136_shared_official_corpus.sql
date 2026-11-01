-- Explicitly admitted versions are global; normal workspace sources never are.
create table if not exists copeit_private.shared_official_versions (
  document_version_id uuid primary key references public.document_versions(id) on delete cascade,
  admitted_by uuid not null references auth.users(id),
  admitted_at timestamptz not null default now(),
  licence_decision text not null check (length(trim(licence_decision)) >= 10),
  next_review_at timestamptz not null,
  enabled boolean not null default false
);
alter table copeit_private.shared_official_versions enable row level security;
revoke all on copeit_private.shared_official_versions from public, anon, authenticated;
grant select,insert,update,delete on copeit_private.shared_official_versions to service_role;

create or replace function public.search_shared_official_chunks(p_query text,p_query_embedding extensions.vector(768),p_limit integer default 8)
returns table(chunk_id uuid,source_id uuid,title text,version_label text,canonical_url text,page_start integer,page_end integer,heading_path text[],content text,vector_similarity real,hybrid_score real)
language sql stable security invoker set search_path = '' as $$
  with eligible as (
    select c.id as chunk_id,s.id as source_id,s.title,dv.version_label,s.canonical_url,c.page_start,c.page_end,c.heading_path,c.content,
      1-(e.embedding OPERATOR(extensions.<=>) p_query_embedding) as vector_similarity,
      ts_rank_cd(to_tsvector('english',c.content),websearch_to_tsquery('english',p_query)) as text_rank
    from copeit_private.shared_official_versions g
    join public.document_versions dv on dv.id=g.document_version_id
    join public.sources s on s.id=dv.source_id and s.tenant_id=dv.tenant_id
    join public.source_reviews r on r.document_version_id=dv.id and r.tenant_id=dv.tenant_id and r.status='approved'
    join public.document_chunks c on c.document_version_id=dv.id and c.tenant_id=dv.tenant_id
    join copeit_private.chunk_embeddings e on e.chunk_id=c.id and e.tenant_id=c.tenant_id
    where g.enabled and g.next_review_at>now() and s.source_type='official_guidance' and s.product_id is null
      and s.retrieval_eligible and dv.extraction_status='ready' and s.canonical_url like 'https://%'
  )
  select chunk_id,source_id,title,version_label,canonical_url,page_start,page_end,heading_path,content,
    vector_similarity::real,(0.75*vector_similarity+0.25*least(text_rank,1))::real
  from eligible order by (0.75*vector_similarity+0.25*least(text_rank,1)) desc limit least(greatest(p_limit,1),12);
$$;
revoke all on function public.search_shared_official_chunks(text,extensions.vector,integer) from public,anon,authenticated;
grant execute on function public.search_shared_official_chunks(text,extensions.vector,integer) to service_role;
