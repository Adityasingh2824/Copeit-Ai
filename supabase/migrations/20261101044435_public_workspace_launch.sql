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

-- A restrictive policy applies alongside ALL existing permissive policies.
-- Both the referenced product and profile must belong to the same workspace.
create policy product_profiles_product_tenant_match on public.product_profiles
as restrictive for all to authenticated
using (exists(select 1 from public.products p where p.id = product_profiles.product_id and p.tenant_id = product_profiles.tenant_id))
with check (exists(select 1 from public.products p where p.id = product_profiles.product_id and p.tenant_id = product_profiles.tenant_id));

revoke all on public.product_profiles from public, anon, authenticated;
grant select, insert, update on public.product_profiles to authenticated;
