-- Public self-service onboarding. Retain verification, tenant isolation and one owned workspace.
create or replace function public.can_provision_workspace()
returns boolean language sql stable security definer
set search_path = public, auth, pg_temp as $$
  select exists(select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false));
$$;
revoke all on function public.can_provision_workspace() from public, anon;
grant execute on function public.can_provision_workspace() to authenticated;
-- Public onboarding: verified users may own one workspace.
-- Serialize creation per user so concurrent requests cannot bypass the limit.
create or replace function public.create_workspace(p_name text)
returns public.tenants language plpgsql security definer
set search_path = public, auth, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant public.tenants;
begin
  if v_user_id is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if not exists(select 1 from auth.users where id = v_user_id and email_confirmed_at is not null and not coalesce(is_anonymous, false)) then
    raise exception 'email_confirmation_required' using errcode = '42501';
  end if;
  if exists(select 1 from public.tenants where created_by = v_user_id) then
    raise exception 'workspace_limit_reached' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'invalid_workspace_name' using errcode = '22023';
  end if;
  insert into public.tenants(name, created_by) values(trim(p_name), v_user_id) returning * into v_tenant;
  insert into public.memberships(tenant_id, user_id, role) values(v_tenant.id, v_user_id, 'owner');
  return v_tenant;
end; $$;
revoke all on function public.create_workspace(text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;


revoke insert on public.tenants from authenticated;
