-- Avoid querying memberships from its own RLS policy. This helper executes
-- with the migration owner, but only answers for the caller's current JWT.
create or replace function public.is_current_user_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_current_user_tenant_admin(uuid) from public, anon;
grant execute on function public.is_current_user_tenant_admin(uuid) to authenticated;

drop policy if exists memberships_select on public.memberships;
create policy memberships_select
  on public.memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_current_user_tenant_admin(tenant_id)
  );
