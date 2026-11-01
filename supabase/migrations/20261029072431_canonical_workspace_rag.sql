-- Canonical workspace and RAG workflow for the isolated Copeit staging project.
-- This migration intentionally does not accept customer uploads or unreviewed retrieval.

alter table public.products add column if not exists model text;
alter table public.products add column if not exists intended_use text;

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 180),
  status text not null default 'open' check (status in ('open','done')),
  due_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id),
  check ((status = 'done' and completed_at is not null) or (status = 'open' and completed_at is null))
);
create index if not exists work_items_tenant_status_created_idx on public.work_items(tenant_id, status, created_at desc);

create table if not exists public.source_review_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_version_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  from_status text,
  to_status text not null check (to_status in ('approved','rejected','revoked','superseded')),
  rationale text not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade
);
create index if not exists source_review_events_tenant_version_created_idx on public.source_review_events(tenant_id, document_version_id, created_at desc);

create table if not exists public.rag_answer_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  question_hash text not null check (question_hash ~ '^[0-9a-f]{64}$'),
  answer_status text not null check (answer_status in ('answered','insufficient_evidence','failed')),
  model text,
  retrieval_count integer not null default 0 check (retrieval_count >= 0),
  latency_ms integer not null check (latency_ms >= 0),
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rag_answer_audits_tenant_created_idx on public.rag_answer_audits(tenant_id, created_at desc);

create table if not exists public.rag_rate_windows (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  primary key (tenant_id, user_id)
);

alter table public.work_items enable row level security;
alter table public.source_review_events enable row level security;
alter table public.rag_answer_audits enable row level security;
alter table public.rag_rate_windows enable row level security;

grant select, insert, update on public.work_items to authenticated;
grant select on public.source_review_events, public.rag_answer_audits to authenticated;

create policy work_items_select on public.work_items for select to authenticated
  using (exists (select 1 from public.memberships m where m.tenant_id = work_items.tenant_id and m.user_id = (select auth.uid())));
create policy work_items_insert on public.work_items for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = work_items.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy work_items_update on public.work_items for update to authenticated
  using (exists (select 1 from public.memberships m where m.tenant_id = work_items.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')))
  with check (exists (select 1 from public.memberships m where m.tenant_id = work_items.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy source_review_events_select on public.source_review_events for select to authenticated
  using (exists (select 1 from public.memberships m where m.tenant_id = source_review_events.tenant_id and m.user_id = (select auth.uid())));
create policy rag_answer_audits_select on public.rag_answer_audits for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = rag_answer_audits.tenant_id and m.user_id = (select auth.uid())));

-- Files are handled by authenticated Edge Functions; browser clients cannot bypass source metadata or review.
drop policy if exists rag_quarantine_write on storage.objects;
drop policy if exists rag_quarantine_read on storage.objects;
drop policy if exists rag_approved_read on storage.objects;
revoke insert, update, delete on public.sources, public.document_versions, public.ingestion_jobs from authenticated;
revoke insert, update, delete on public.source_reviews from authenticated;
drop policy if exists reviews_update on public.source_reviews;

create or replace function public.create_workspace(p_name text)
returns public.tenants
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant public.tenants;
begin
  if v_user_id is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then raise exception 'invalid_workspace_name' using errcode = '22023'; end if;
  insert into public.tenants(name, created_by) values (trim(p_name), v_user_id) returning * into v_tenant;
  insert into public.memberships(tenant_id, user_id, role) values (v_tenant.id, v_user_id, 'owner');
  return v_tenant;
end;
$$;

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
  if p_status = 'approved' and v_source_type not in ('synthetic','public_reference') then raise exception 'source_type_not_allowed_in_staging' using errcode = '22023'; end if;
  if v_previous_status <> 'pending' and p_status in ('approved','rejected') then raise exception 'review_already_finalized' using errcode = '22023'; end if;
  update public.source_reviews set status = p_status, reviewer_id = v_user_id, rationale = trim(p_rationale), reviewed_at = now()
  where id = v_review_id returning * into v_review;
  insert into public.source_review_events(tenant_id, document_version_id, actor_id, from_status, to_status, rationale)
  values (v_review.tenant_id, v_review.document_version_id, v_user_id, v_previous_status, p_status, trim(p_rationale));
  return v_review;
end;
$$;

create or replace function public.store_chunk_embedding(p_tenant_id uuid, p_chunk_id uuid, p_model text, p_embedding extensions.vector(768))
returns void
language plpgsql
security definer
set search_path = public, copeit_private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.document_chunks c
    join public.document_versions dv on dv.id = c.document_version_id and dv.tenant_id = c.tenant_id
    join public.source_reviews r on r.document_version_id = dv.id and r.tenant_id = dv.tenant_id and r.status = 'approved'
    where c.id = p_chunk_id and c.tenant_id = p_tenant_id
  ) then raise exception 'approved_chunk_required' using errcode = '42501'; end if;
  insert into copeit_private.chunk_embeddings(chunk_id, tenant_id, model, embedding)
  values (p_chunk_id, p_tenant_id, p_model, p_embedding)
  on conflict (chunk_id) do update set tenant_id = excluded.tenant_id, model = excluded.model, embedding = excluded.embedding, created_at = now();
end;
$$;

create or replace function public.consume_rag_rate_limit(p_tenant_id uuid, p_user_id uuid, p_limit integer default 20)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  insert into public.rag_rate_windows(tenant_id, user_id, window_started_at, request_count)
  values (p_tenant_id, p_user_id, now(), 1)
  on conflict (tenant_id, user_id) do update set
    window_started_at = case when public.rag_rate_windows.window_started_at < now() - interval '1 minute' then now() else public.rag_rate_windows.window_started_at end,
    request_count = case when public.rag_rate_windows.window_started_at < now() - interval '1 minute' then 1 else public.rag_rate_windows.request_count + 1 end
  returning request_count into v_count;
  return v_count <= greatest(1, least(p_limit, 120));
end;
$$;

revoke all on function public.create_workspace(text) from public;
revoke all on function public.submit_source_review(uuid, text, text) from public;
revoke all on function public.store_chunk_embedding(uuid, uuid, text, extensions.vector) from public;
revoke all on function public.consume_rag_rate_limit(uuid, uuid, integer) from public;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.submit_source_review(uuid, text, text) to authenticated;
grant execute on function public.store_chunk_embedding(uuid, uuid, text, extensions.vector) to service_role;
grant execute on function public.consume_rag_rate_limit(uuid, uuid, integer) to service_role;
