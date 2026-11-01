-- Hardening found by the initial staging security and performance scan.
create policy embeddings_service_only on copeit_private.chunk_embeddings
  for all to service_role using (true) with check (true);

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create policy reviews_update on public.source_reviews for update to authenticated
  using (exists (select 1 from public.memberships m where m.tenant_id = source_reviews.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','reviewer')))
  with check (reviewer_id = (select auth.uid()) and status <> 'pending' and reviewed_at is not null and exists (select 1 from public.memberships m where m.tenant_id = source_reviews.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','lead','reviewer')));

create index chunk_embeddings_tenant_idx on copeit_private.chunk_embeddings(tenant_id);
create index answer_citations_tenant_chunk_idx on public.answer_citations(tenant_id, chunk_id);
create index document_chunks_tenant_version_idx on public.document_chunks(tenant_id, document_version_id);
create index document_versions_tenant_source_idx on public.document_versions(tenant_id, source_id);
create index document_versions_created_by_idx on public.document_versions(created_by);
create index ingestion_jobs_tenant_version_idx on public.ingestion_jobs(tenant_id, document_version_id);
create index ingestion_jobs_created_by_idx on public.ingestion_jobs(created_by);
create index products_created_by_idx on public.products(created_by);
create index source_reviews_tenant_version_idx on public.source_reviews(tenant_id, document_version_id);
create index source_reviews_reviewer_idx on public.source_reviews(reviewer_id);
create index sources_created_by_idx on public.sources(created_by);
create index tenants_created_by_idx on public.tenants(created_by);
