-- Run on staging and production; all boolean columns must be true.
select
  not has_table_privilege('authenticated','public.tenants','INSERT') as direct_tenant_creation_blocked,
  not has_table_privilege('authenticated','public.workspace_provisioners','INSERT') as browser_provisioning_blocked,
  not has_function_privilege('anon','public.create_workspace(text)','EXECUTE') as anonymous_creation_blocked,
  not has_function_privilege('authenticated','public.claim_next_ingestion_job(uuid)','EXECUTE') as browser_worker_claim_blocked,
  position('extraction_status = ''ready''' in pg_get_functiondef('public.search_approved_chunks(uuid,text,extensions.vector,integer,uuid)'::regprocedure)) > 0 as extraction_ready_required;
