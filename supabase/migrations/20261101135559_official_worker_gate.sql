-- Pilot production accepts only reviewed official guidance, not synthetic files.
create or replace function public.claim_official_ingestion_job(p_worker_id uuid, p_tenant_id uuid, p_document_version_id uuid)
returns public.ingestion_jobs language plpgsql security definer set search_path = public, pg_temp as $$
declare v_job public.ingestion_jobs;
begin
  select j.* into v_job from public.ingestion_jobs j
    join public.document_versions dv on dv.id=j.document_version_id and dv.tenant_id=j.tenant_id
    join public.sources s on s.id=dv.source_id and s.tenant_id=dv.tenant_id
    join public.source_reviews r on r.document_version_id=dv.id and r.tenant_id=dv.tenant_id
    where j.tenant_id=p_tenant_id and j.document_version_id=p_document_version_id
      and j.status in ('queued','retry_wait') and j.available_at <= now() and j.attempts < j.max_attempts
      and s.source_type='official_guidance' and s.retrieval_eligible and r.status='approved'
      and dv.extraction_status in ('pending','failed')
    for update of j skip locked limit 1;
  if not found then return null; end if;
  update public.ingestion_jobs set status='extracting', attempts=attempts+1, locked_at=now(), locked_by=p_worker_id,
    last_heartbeat_at=now(), started_at=coalesce(started_at,now()), completed_at=null,error_code=null,error_detail=null
    where id=v_job.id returning * into v_job;
  insert into public.ingestion_job_events(tenant_id,ingestion_job_id,event_type,attempt) values(v_job.tenant_id,v_job.id,'claimed',v_job.attempts);
  return v_job;
end $$;
revoke all on function public.claim_official_ingestion_job(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_official_ingestion_job(uuid,uuid,uuid) to service_role;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.search_approved_chunks(uuid,text,extensions.vector,integer,uuid)'::regprocedure) into definition;
  if position('s.source_type = ''official_guidance''' in definition)=0 then
    definition := replace(definition, 'and s.retrieval_eligible', 'and s.source_type = ''official_guidance'' and s.retrieval_eligible');
    if position('s.source_type = ''official_guidance''' in definition)=0 then raise exception 'retrieval_definition_not_recognized'; end if;
    execute definition;
  end if;
end $$;
