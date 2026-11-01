-- Public prototype: a verified user can create exactly one owner workspace.
-- RAG source ingestion and retrieval remain separately feature-gated.
create or replace function public.create_workspace(p_name text)
returns public.tenants
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_confirmed_at timestamptz;
  v_tenant public.tenants;
begin
  if v_user_id is null then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;

  select email_confirmed_at into v_confirmed_at
  from auth.users
  where id = v_user_id;
  if v_confirmed_at is null then
    raise exception 'email_confirmation_required' using errcode = '42501';
  end if;

  if exists (select 1 from public.tenants where created_by = v_user_id) then
    raise exception 'workspace_limit_reached' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'invalid_workspace_name' using errcode = '22023';
  end if;

  insert into public.tenants(name, created_by)
  values (trim(p_name), v_user_id)
  returning * into v_tenant;
  insert into public.memberships(tenant_id, user_id, role)
  values (v_tenant.id, v_user_id, 'owner');
  return v_tenant;
end;
$$;

revoke all on function public.create_workspace(text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;
