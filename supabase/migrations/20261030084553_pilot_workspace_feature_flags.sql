-- Server-side pilot controls. Browser configuration must never grant access to
-- Gemini or retrieval; the Edge Function checks this tenant-scoped allowlist.
create table if not exists public.tenant_feature_flags (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_key text not null check (feature_key in ('rag_pilot')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (tenant_id, feature_key)
);

alter table public.tenant_feature_flags enable row level security;
revoke all on public.tenant_feature_flags from anon, authenticated;

-- Service-only management: pilot allowlisting is an operational release
-- decision, not an end-user workspace setting.
revoke all on public.tenant_feature_flags from public;
grant select, insert, update, delete on public.tenant_feature_flags to service_role;

create index if not exists tenant_feature_flags_enabled_idx
  on public.tenant_feature_flags (feature_key, tenant_id)
  where enabled;
