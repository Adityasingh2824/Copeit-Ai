-- Copeit AI RAG staging foundation. Designed for an empty, isolated project.
create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create schema if not exists copeit_private;
revoke all on schema copeit_private from public;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','lead','editor','reviewer','viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index memberships_user_tenant_idx on public.memberships(user_id, tenant_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  category text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index products_tenant_created_idx on public.products(tenant_id, created_at desc);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 300),
  source_type text not null check (source_type in ('synthetic','official_guidance','public_reference','customer_upload','internal_planning')),
  jurisdiction text not null default 'EU',
  language text not null default 'en' check (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  canonical_url text,
  licence_note text,
  retention_class text not null default 'staging_30d' check (retention_class in ('staging_30d','staging_90d','legal_hold')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id),
  unique (tenant_id, id)
);
create index sources_tenant_product_idx on public.sources(tenant_id, product_id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_id uuid not null,
  version_label text not null check (char_length(trim(version_label)) between 1 and 80),
  storage_bucket text not null default 'rag-quarantine' check (storage_bucket in ('rag-quarantine','rag-approved')),
  storage_path text not null,
  media_type text not null,
  byte_size bigint not null check (byte_size between 1 and 26214400),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  extraction_status text not null default 'pending' check (extraction_status in ('pending','processing','ready','failed')),
  effective_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, source_id) references public.sources(tenant_id, id) on delete cascade,
  unique (tenant_id, sha256),
  unique (source_id, version_label),
  unique (tenant_id, id),
  check (storage_path like tenant_id::text || '/%')
);
create index document_versions_source_created_idx on public.document_versions(source_id, created_at desc);

create table public.source_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_version_id uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked','superseded')),
  reviewer_id uuid references auth.users(id) on delete restrict,
  rationale text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade,
  unique (document_version_id),
  check ((status = 'pending' and reviewer_id is null and reviewed_at is null) or (status <> 'pending' and reviewer_id is not null and reviewed_at is not null))
);
create index source_reviews_status_idx on public.source_reviews(tenant_id, status);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_version_id uuid not null,
  ordinal integer not null check (ordinal >= 0),
  content text not null check (char_length(trim(content)) between 1 and 12000),
  heading_path text[] not null default '{}',
  page_start integer check (page_start is null or page_start > 0),
  page_end integer check (page_end is null or page_end >= page_start),
  token_count integer not null check (token_count > 0),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade,
  unique (document_version_id, ordinal),
  unique (tenant_id, id)
);
create index document_chunks_version_ordinal_idx on public.document_chunks(document_version_id, ordinal);
create index document_chunks_fts_idx on public.document_chunks using gin(to_tsvector('english', content));

create table copeit_private.chunk_embeddings (
  chunk_id uuid primary key references public.document_chunks(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  model text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now()
);
create index chunk_embeddings_hnsw_idx on copeit_private.chunk_embeddings using hnsw (embedding extensions.vector_cosine_ops);

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_version_id uuid not null,
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','extracting','chunking','embedding','completed','failed')),
  chunks_total integer not null default 0 check (chunks_total >= 0),
  chunks_embedded integer not null default 0 check (chunks_embedded >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  error_code text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  foreign key (tenant_id, document_version_id) references public.document_versions(tenant_id, id) on delete cascade,
  unique (tenant_id, idempotency_key)
);

create table public.answer_citations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  chunk_id uuid not null,
  question_hash text not null check (question_hash ~ '^[0-9a-f]{64}$'),
  retrieval_score real not null check (retrieval_score between 0 and 1),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, chunk_id) references public.document_chunks(tenant_id, id)
);

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.products enable row level security;
alter table public.sources enable row level security;
alter table public.document_versions enable row level security;
alter table public.source_reviews enable row level security;
alter table public.document_chunks enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.answer_citations enable row level security;
alter table copeit_private.chunk_embeddings enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema copeit_private from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert on public.tenants to authenticated;
grant select on public.memberships, public.products, public.sources, public.document_versions, public.source_reviews, public.document_chunks, public.ingestion_jobs, public.answer_citations to authenticated;
grant insert on public.products, public.sources, public.document_versions, public.ingestion_jobs to authenticated;

create policy tenants_select on public.tenants for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = tenants.id and m.user_id = (select auth.uid())));
create policy tenants_insert on public.tenants for insert to authenticated with check (created_by = (select auth.uid()));
create policy memberships_select on public.memberships for select to authenticated using (user_id = (select auth.uid()));
create policy products_select on public.products for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = products.tenant_id and m.user_id = (select auth.uid())));
create policy products_insert on public.products for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = products.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy sources_select on public.sources for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = sources.tenant_id and m.user_id = (select auth.uid())));
create policy sources_insert on public.sources for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = sources.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy versions_select on public.document_versions for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = document_versions.tenant_id and m.user_id = (select auth.uid())));
create policy versions_insert on public.document_versions for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = document_versions.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy reviews_select on public.source_reviews for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = source_reviews.tenant_id and m.user_id = (select auth.uid())));
create policy chunks_approved_select on public.document_chunks for select to authenticated using (exists (select 1 from public.source_reviews r join public.memberships m on m.tenant_id = r.tenant_id where r.document_version_id = document_chunks.document_version_id and r.status = 'approved' and m.user_id = (select auth.uid())));
create policy jobs_select on public.ingestion_jobs for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = ingestion_jobs.tenant_id and m.user_id = (select auth.uid())));
create policy jobs_insert on public.ingestion_jobs for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = ingestion_jobs.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy citations_select on public.answer_citations for select to authenticated using (exists (select 1 from public.memberships m where m.tenant_id = answer_citations.tenant_id and m.user_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rag-quarantine','rag-quarantine',false,26214400,array['text/plain','text/markdown','text/csv'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rag-approved','rag-approved',false,26214400,array['text/plain','text/markdown','text/csv'])
on conflict (id) do nothing;
create policy rag_quarantine_read on storage.objects for select to authenticated using (bucket_id = 'rag-quarantine' and exists (select 1 from public.memberships m where m.tenant_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid())));
create policy rag_quarantine_write on storage.objects for insert to authenticated with check (bucket_id = 'rag-quarantine' and exists (select 1 from public.memberships m where m.tenant_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','editor')));
create policy rag_approved_read on storage.objects for select to authenticated using (bucket_id = 'rag-approved' and exists (select 1 from public.memberships m where m.tenant_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid())));
