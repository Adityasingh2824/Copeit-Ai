-- Controlled pilot onboarding: browser users may join with a verified
-- invitation but cannot create arbitrary tenants by calling an RPC directly.
create table if not exists public.workspace_provisioners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.workspace_provisioners enable row level security;
revoke all on public.workspace_provisioners from public, anon, authenticated;
grant select, insert, update, delete on public.workspace_provisioners to service_role;

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
  if not exists (select 1 from public.workspace_provisioners p where p.user_id = v_user_id) then
    raise exception 'pilot_invitation_required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then raise exception 'invalid_workspace_name' using errcode = '22023'; end if;
  insert into public.tenants(name, created_by) values (trim(p_name), v_user_id) returning * into v_tenant;
  insert into public.memberships(tenant_id, user_id, role) values (v_tenant.id, v_user_id, 'owner');
  return v_tenant;
end;
$$;

revoke all on function public.create_workspace(text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;
