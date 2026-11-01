-- Keep the RLS helper outside PostgREST's public API schema. Authenticated
-- callers may execute it only while evaluating a policy; the private schema
-- is not exposed as an RPC surface.
create or replace function copeit_private.is_current_user_tenant_admin(p_tenant_id uuid)
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

grant usage on schema copeit_private to authenticated;
revoke all on function copeit_private.is_current_user_tenant_admin(uuid) from public, anon;
grant execute on function copeit_private.is_current_user_tenant_admin(uuid) to authenticated;

drop policy if exists memberships_select on public.memberships;
create policy memberships_select
  on public.memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or copeit_private.is_current_user_tenant_admin(tenant_id)
  );

drop function if exists public.is_current_user_tenant_admin(uuid);
