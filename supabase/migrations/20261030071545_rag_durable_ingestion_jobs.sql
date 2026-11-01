-- Staging-only durable ingestion foundation. Do not apply to production until
-- the worker secret, Vault configuration, monitoring and restore gate pass.

alter table public.ingestion_jobs
  add column if not exists available_at timestamptz default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid,
  add column if not exists max_attempts integer not null default 3 check (max_attempts between 1 and 8),
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists failure_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(failure_history) = 'array');

alter table public.ingestion_jobs drop constraint if exists ingestion_jobs_status_check;
alter table public.ingestion_jobs
  add constraint ingestion_jobs_status_check
  check (status in ('queued','extracting','chunking','embedding','retry_wait','completed','failed','dead_letter'));

create index if not exists ingestion_jobs_claim_idx
  on public.ingestion_jobs (available_at, created_at)
  where status in ('queued', 'retry_wait');

create table if not exists public.ingestion_job_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ingestion_job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  event_type text not null check (event_type in ('queued','claimed','retry_scheduled','completed','dead_letter')),
  error_code text,
  attempt integer not null check (attempt >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ingestion_job_events_job_created_idx
  on public.ingestion_job_events (ingestion_job_id, created_at desc);

alter table public.ingestion_job_events enable row level security;
revoke all on public.ingestion_job_events from anon;
grant select on public.ingestion_job_events to authenticated;
create policy ingestion_job_events_member_select on public.ingestion_job_events
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.tenant_id = ingestion_job_events.tenant_id
      and m.user_id = (select auth.uid())
  ));

-- Atomic SKIP LOCKED claim prevents concurrent Edge Function invocations from
-- embedding the same approved version. It is service-only and cannot be called
-- by browser clients.
create or replace function public.claim_next_ingestion_job(p_worker_id uuid)
returns public.ingestion_jobs
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_job public.ingestion_jobs;
begin
  select j.* into v_job
  from public.ingestion_jobs j
  join public.document_versions dv on dv.id = j.document_version_id and dv.tenant_id = j.tenant_id
  join public.source_reviews r on r.document_version_id = dv.id and r.tenant_id = dv.tenant_id
  where j.status in ('queued', 'retry_wait')
    and j.available_at <= now()
    and j.attempts < j.max_attempts
    and r.status = 'approved'
    and dv.extraction_status in ('pending', 'failed')
  order by j.available_at, j.created_at
  for update of j skip locked
  limit 1;

  if not found then return null; end if;

  update public.ingestion_jobs
  set status = 'extracting',
      attempts = attempts + 1,
      locked_at = now(),
      locked_by = p_worker_id,
      last_heartbeat_at = now(),
      started_at = coalesce(started_at, now()),
      completed_at = null,
      error_code = null,
      error_detail = null
  where id = v_job.id
  returning * into v_job;

  insert into public.ingestion_job_events(tenant_id, ingestion_job_id, event_type, attempt)
  values (v_job.tenant_id, v_job.id, 'claimed', v_job.attempts);
  return v_job;
end;
$$;

revoke all on function public.claim_next_ingestion_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_next_ingestion_job(uuid) to service_role;
