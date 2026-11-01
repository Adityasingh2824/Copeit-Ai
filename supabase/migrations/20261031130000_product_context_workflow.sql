-- Tenant-scoped, user-entered product facts used to organise preparation.
-- This is explicitly not a regulatory classification or compliance record.
create table if not exists public.product_profiles (
  product_id uuid primary key references public.products(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists product_profiles_tenant_idx on public.product_profiles(tenant_id);

alter table public.product_profiles enable row level security;
revoke all on public.product_profiles from anon;
grant select, insert, update on public.product_profiles to authenticated;

create policy product_profiles_member_select on public.product_profiles
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.tenant_id = product_profiles.tenant_id
      and m.user_id = (select auth.uid())
 ));

create policy product_profiles_editor_insert on public.product_profiles
  for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and exists (
      select 1 from public.memberships m
      where m.tenant_id = product_profiles.tenant_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'lead', 'editor')
    )
  );

create policy product_profiles_editor_update on public.product_profiles
  for update to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.tenant_id = product_profiles.tenant_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'lead', 'editor')
  ))
  with check (
    updated_by = (select auth.uid())
    and exists (
      select 1 from public.memberships m
      where m.tenant_id = product_profiles.tenant_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'lead', 'editor')
    )
  );

