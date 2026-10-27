-- Copeit AI pilot foundation. Apply to a new/staging Supabase project first.
-- This deliberately contains no regulatory catalog or customer document storage.
create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','lead','editor','reviewer','viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index if not exists memberships_user_id_idx on public.memberships(user_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  model text not null check (length(trim(model)) between 1 and 80),
  category text not null default 'Unscoped electronics',
  intended_use text not null default '',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index if not exists products_tenant_id_idx on public.products(tenant_id);

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_id uuid not null,
  label text not null,
  summary text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete cascade,
  unique (tenant_id, product_id, label)
);
create index if not exists product_versions_tenant_id_idx on public.product_versions(tenant_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid,
  title text not null check (length(trim(title)) between 2 and 180),
  status text not null default 'open' check (status in ('open','working','blocked','done')),
  due_date date,
  created_by uuid not null references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint task_completion_matches_status check ((status = 'done') = (completed_at is not null)),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id)
);
create index if not exists tasks_tenant_id_idx on public.tasks(tenant_id);

-- Private per-user workspace conversations. Assistant records are workflow lookups,
-- never an approved regulatory source or a shared tenant decision.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (length(trim(body)) between 1 and 5000),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_owner_idx on public.chat_messages(tenant_id, user_id, created_at);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  object_type text not null,
  object_id uuid not null,
  snapshot jsonb not null,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_events_tenant_id_idx on public.audit_events(tenant_id, occurred_at desc);

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.products enable row level security;
alter table public.product_versions enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_messages enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.tenants, public.memberships, public.products, public.product_versions, public.tasks, public.audit_events from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant select, insert on public.tenants to authenticated;
grant select on public.memberships to authenticated;
grant select, insert on public.products to authenticated;
grant select, insert on public.product_versions to authenticated;
grant select, insert on public.tasks to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant update (status, completed_at) on public.tasks to authenticated;
grant select on public.audit_events to authenticated;

create policy tenants_select on public.tenants for select to authenticated
using (owner_id = (select auth.uid()));
create policy tenants_insert on public.tenants for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy memberships_select on public.memberships for select to authenticated
using (user_id = (select auth.uid()));
create policy products_select on public.products for select to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = products.tenant_id and m.user_id = (select auth.uid())));
create policy products_insert on public.products for insert to authenticated
with check (exists (select 1 from public.memberships m where m.tenant_id = products.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));

create policy product_versions_select on public.product_versions for select to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = product_versions.tenant_id and m.user_id = (select auth.uid())));
create policy product_versions_insert on public.product_versions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.memberships m where m.tenant_id = product_versions.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor'))
);

create policy tasks_select on public.tasks for select to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = tasks.tenant_id and m.user_id = (select auth.uid())));
create policy chat_messages_select on public.chat_messages for select to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = chat_messages.tenant_id and m.user_id = (select auth.uid())));
create policy chat_messages_insert on public.chat_messages for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = chat_messages.tenant_id and m.user_id = (select auth.uid())));
create policy tasks_insert on public.tasks for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.memberships m where m.tenant_id = tasks.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor'))
);
create policy tasks_update on public.tasks for update to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = tasks.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')))
with check (exists (select 1 from public.memberships m where m.tenant_id = tasks.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));

create policy audit_events_select on public.audit_events for select to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = audit_events.tenant_id and m.user_id = (select auth.uid())));

-- Database-owned append-only history for the currently implemented mutations.
create schema if not exists copeit_private;
revoke all on schema copeit_private from public, anon, authenticated;
create or replace function copeit_private.bootstrap_tenant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from auth.uid() then
    raise exception 'Tenant owner must be the signed-in user';
  end if;
  insert into public.memberships(tenant_id, user_id, role) values (new.id, new.owner_id, 'owner');
  insert into public.audit_events(tenant_id, actor_id, event_type, object_type, object_id, snapshot)
  values (new.id, new.owner_id, 'INSERT', 'tenants', new.id, to_jsonb(new));
  return new;
end;
$$;
revoke all on function copeit_private.bootstrap_tenant() from public, anon, authenticated;
create trigger bootstrap_tenant after insert on public.tenants for each row execute function copeit_private.bootstrap_tenant();
create or replace function copeit_private.write_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(tenant_id, actor_id, event_type, object_type, object_id, snapshot)
  values (new.tenant_id, auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(new));
  return new;
end;
$$;
revoke all on function copeit_private.write_audit() from public, anon, authenticated;
create trigger audit_product after insert on public.products for each row execute function copeit_private.write_audit();
create trigger audit_product_version after insert on public.product_versions for each row execute function copeit_private.write_audit();
create trigger audit_task after insert or update on public.tasks for each row execute function copeit_private.write_audit();

-- Private document ingestion, provenance, review, and export foundation.
-- Storage object names must be tenant-prefixed: <tenant_id>/<document_id>/<version>/<filename>.
create extension if not exists vector with schema extensions;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_type text not null check (source_type in ('upload','url','regulator','standard','manufacturer','internal','other')),
  title text not null check (length(trim(title)) between 2 and 240),
  publisher text,
  canonical_uri text,
  jurisdiction text,
  authority_level text not null default 'unreviewed' check (authority_level in ('unreviewed','informative','official','primary_law','harmonised_standard')),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index if not exists sources_tenant_id_idx on public.sources(tenant_id, created_at desc);
create unique index if not exists sources_canonical_uri_idx on public.sources(tenant_id, canonical_uri) where canonical_uri is not null;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid,
  product_id uuid,
  title text not null check (length(trim(title)) between 2 and 240),
  document_type text not null default 'evidence' check (document_type in ('evidence','requirement','standard','certificate','test_report','technical_file','other')),
  status text not null default 'active' check (status in ('active','superseded','archived')),
  current_version_number integer not null default 0 check (current_version_number >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, source_id) references public.sources(tenant_id, id),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id),
  unique (tenant_id, id)
);
create index if not exists documents_tenant_id_idx on public.documents(tenant_id, updated_at desc);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_id uuid not null,
  version_number integer not null check (version_number > 0),
  storage_bucket text not null default 'source-documents' check (storage_bucket = 'source-documents'),
  storage_path text not null,
  original_filename text not null,
  media_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, document_id) references public.documents(tenant_id, id) on delete cascade,
  unique (tenant_id, id),
  unique (document_id, version_number),
  unique (tenant_id, sha256),
  unique (storage_bucket, storage_path)
);
create index if not exists document_versions_document_idx on public.document_versions(document_id, version_number desc);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_version_id uuid not null,
  ordinal integer not null check (ordinal >= 0),
  content text not null check (length(content) > 0),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  page_from integer check (page_from > 0),
  page_to integer check (page_to >= page_from),
  char_from integer check (char_from >= 0),
  char_to integer check (char_to > char_from),
  token_count integer check (token_count > 0),
  chunk_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(chunk_metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade,
  unique (tenant_id, id),
  unique (document_version_id, ordinal)
);
create index if not exists chunks_version_idx on public.chunks(document_version_id, ordinal);

create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  chunk_id uuid not null,
  model text not null,
  dimensions integer not null check (dimensions between 1 and 4096),
  embedding extensions.vector not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, chunk_id) references public.chunks(tenant_id, id) on delete cascade,
  unique (tenant_id, id),
  unique (chunk_id, model)
);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_version_id uuid not null,
  status text not null default 'queued' check (status in ('queued','processing','retry_wait','succeeded','failed','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  last_error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  job_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(job_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade,
  constraint ingestion_attempt_limit check (attempt_count <= max_attempts),
  constraint ingestion_retry_schedule check ((status = 'retry_wait') = (next_retry_at is not null)),
  constraint ingestion_finished_state check ((status in ('succeeded','failed','cancelled')) = (finished_at is not null)),
  unique (tenant_id, id)
);
create index if not exists ingestion_jobs_claim_idx on public.ingestion_jobs(status, next_retry_at, created_at) where status in ('queued','retry_wait');
create index if not exists ingestion_jobs_version_idx on public.ingestion_jobs(document_version_id, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_version_id uuid not null,
  review_type text not null default 'ingestion' check (review_type in ('ingestion','source','evidence','regulatory')),
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','rejected')),
  reviewer_id uuid references auth.users(id),
  notes text not null default '',
  decided_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade,
  constraint review_decision_state check ((status = 'pending') = (decided_at is null)),
  unique (tenant_id, id),
  unique (document_version_id, review_type)
);
create index if not exists reviews_queue_idx on public.reviews(tenant_id, status, created_at);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid,
  export_type text not null check (export_type in ('passport','evidence_pack','citation_report','other')),
  version_number integer not null check (version_number > 0),
  status text not null default 'queued' check (status in ('queued','building','ready','failed','expired')),
  storage_bucket text check (storage_bucket is null or storage_bucket = 'exports'),
  storage_path text,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  export_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(export_metadata) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (tenant_id, product_id) references public.products(tenant_id, id),
  constraint export_artifact_complete check (status <> 'ready' or (storage_path is not null and sha256 is not null and completed_at is not null)),
  unique (tenant_id, id),
  unique (tenant_id, export_type, version_number, product_id),
  unique (storage_bucket, storage_path)
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  chunk_id uuid not null,
  chat_message_id uuid,
  export_id uuid,
  citation_order integer not null check (citation_order >= 0),
  quote text,
  locator jsonb not null default '{}'::jsonb check (jsonb_typeof(locator) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, chunk_id) references public.chunks(tenant_id, id),
  foreign key (chat_message_id) references public.chat_messages(id) on delete cascade,
  foreign key (tenant_id, export_id) references public.exports(tenant_id, id) on delete cascade,
  constraint citation_has_one_target check (num_nonnulls(chat_message_id, export_id) = 1),
  unique (tenant_id, id),
  unique (chat_message_id, citation_order),
  unique (export_id, citation_order)
);
create index if not exists citations_chunk_idx on public.citations(chunk_id);

alter table public.sources enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.chunks enable row level security;
alter table public.embeddings enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.reviews enable row level security;
alter table public.citations enable row level security;
alter table public.exports enable row level security;

revoke all on public.sources, public.documents, public.document_versions, public.chunks, public.embeddings, public.ingestion_jobs, public.reviews, public.citations, public.exports from anon, authenticated;
grant select on public.sources, public.documents, public.document_versions, public.chunks, public.embeddings, public.ingestion_jobs, public.reviews, public.citations, public.exports to authenticated;
grant insert on public.sources, public.documents, public.document_versions, public.reviews to authenticated;
grant update (status, reviewer_id, notes, decided_at, updated_at) on public.reviews to authenticated;

create policy sources_select on public.sources for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = sources.tenant_id and m.user_id = (select auth.uid())));
create policy sources_insert on public.sources for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = sources.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy documents_select on public.documents for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = documents.tenant_id and m.user_id = (select auth.uid())));
create policy documents_insert on public.documents for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = documents.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy document_versions_select on public.document_versions for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = document_versions.tenant_id and m.user_id = (select auth.uid())));
create policy document_versions_insert on public.document_versions for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = document_versions.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy chunks_select on public.chunks for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = chunks.tenant_id and m.user_id = (select auth.uid())));
create policy embeddings_select on public.embeddings for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = embeddings.tenant_id and m.user_id = (select auth.uid())));
create policy ingestion_jobs_select on public.ingestion_jobs for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = ingestion_jobs.tenant_id and m.user_id = (select auth.uid())));
create policy reviews_select on public.reviews for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = reviews.tenant_id and m.user_id = (select auth.uid())));
create policy reviews_insert on public.reviews for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = reviews.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor','reviewer')));
create policy reviews_update on public.reviews for update to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = reviews.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','reviewer'))) with check (reviewer_id = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = reviews.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','reviewer')));
create policy citations_select on public.citations for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = citations.tenant_id and m.user_id = (select auth.uid())));
create policy exports_select on public.exports for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = exports.tenant_id and m.user_id = (select auth.uid())));

-- Both buckets are private. Browser uploads are append-only; no UPDATE/DELETE policy is granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('source-documents', 'source-documents', false, 52428800, array['application/pdf','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('exports', 'exports', false, 52428800, array['application/pdf','application/zip','application/json'])
on conflict (id) do nothing;

create policy source_documents_select on storage.objects for select to authenticated using (bucket_id = 'source-documents' and exists (select 1 from public.memberships m where m.tenant_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid())));
create policy source_documents_insert on storage.objects for insert to authenticated with check (bucket_id = 'source-documents' and owner_id = (select auth.uid()::text) and exists (select 1 from public.memberships m where m.tenant_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy exports_select_storage on storage.objects for select to authenticated using (bucket_id = 'exports' and exists (select 1 from public.memberships m where m.tenant_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid())));

create trigger audit_source after insert on public.sources for each row execute function copeit_private.write_audit();
create trigger audit_document after insert or update on public.documents for each row execute function copeit_private.write_audit();
create trigger audit_document_version after insert on public.document_versions for each row execute function copeit_private.write_audit();
create trigger audit_review after insert or update on public.reviews for each row execute function copeit_private.write_audit();
create trigger audit_export after insert or update on public.exports for each row execute function copeit_private.write_audit();

