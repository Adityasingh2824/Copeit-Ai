-- Public-reference provenance for the controlled RAG beta. These fields are
-- metadata only; source content remains in private Storage and is never
-- committed to Git.
alter table public.sources
  add column if not exists publisher_name text,
  add column if not exists source_published_at date,
  add column if not exists source_checked_at timestamptz,
  add column if not exists retrieval_eligible boolean not null default false;

alter table public.document_versions
  add column if not exists source_fetched_at timestamptz;

create index if not exists sources_retrieval_eligible_idx
  on public.sources (tenant_id, source_type, retrieval_eligible)
  where retrieval_eligible;

-- Founder approval is permitted only for this narrow public beta. The
-- application records the reason in the existing immutable review event; a
-- qualified reviewer is still required before customer-source ingestion.
create or replace function public.submit_source_review(p_document_version_id uuid, p_status text, p_rationale text)
returns public.source_reviews
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.source_reviews;
  v_review_id uuid;
  v_tenant_id uuid;
  v_source_owner uuid;
  v_source_type text;
  v_role text;
  v_previous_status text;
begin
  if v_user_id is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if p_status not in ('approved','rejected','revoked','superseded') then raise exception 'invalid_review_status' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_rationale, ''))) not between 3 and 4000 then raise exception 'review_rationale_required' using errcode = '22023'; end if;
  select r.id, r.tenant_id, r.status, s.created_by, s.source_type, m.role
  into v_review_id, v_tenant_id, v_previous_status, v_source_owner, v_source_type, v_role
  from public.source_reviews r
  join public.document_versions dv on dv.id = r.document_version_id and dv.tenant_id = r.tenant_id
  join public.sources s on s.id = dv.source_id and s.tenant_id = dv.tenant_id
  join public.memberships m on m.tenant_id = r.tenant_id and m.user_id = v_user_id
  where r.document_version_id = p_document_version_id for update;
  if not found or v_role not in ('owner','admin','lead','reviewer') then raise exception 'reviewer_access_required' using errcode = '42501'; end if;
  if v_source_owner = v_user_id then raise exception 'self_review_not_allowed' using errcode = '42501'; end if;
  if p_status = 'approved' and v_source_type not in ('synthetic','official_guidance','public_reference') then raise exception 'source_type_not_allowed_in_beta' using errcode = '22023'; end if;
  if v_previous_status <> 'pending' and p_status in ('approved','rejected') then raise exception 'review_already_finalized' using errcode = '22023'; end if;
  update public.source_reviews set status = p_status, reviewer_id = v_user_id, rationale = trim(p_rationale), reviewed_at = now()
  where id = v_review_id returning * into v_review;
  update public.sources set retrieval_eligible = (p_status = 'approved')
  where id = (select source_id from public.document_versions where id = p_document_version_id and tenant_id = v_review.tenant_id);
  insert into public.source_review_events(tenant_id, document_version_id, actor_id, from_status, to_status, rationale)
  values (v_review.tenant_id, v_review.document_version_id, v_user_id, v_previous_status, p_status, trim(p_rationale));
  return v_review;
end;
$$;

revoke all on function public.submit_source_review(uuid, text, text) from public, anon;
grant execute on function public.submit_source_review(uuid, text, text) to authenticated;

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
      and s.retrieval_eligible
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
