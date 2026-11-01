-- Self-service pilot collaboration: owners/admins issue single-use codes; recipients accept only with the invited email.
create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  role text not null check (role in ('admin','lead','editor','reviewer','viewer')),
  invite_code_hash text not null unique check (invite_code_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((accepted_at is null and accepted_by is null) or (accepted_at is not null and accepted_by is not null))
);
create index workspace_invitations_tenant_created_idx on public.workspace_invitations(tenant_id, created_at desc);
create index workspace_invitations_email_active_idx on public.workspace_invitations(email, expires_at) where accepted_at is null and revoked_at is null;
alter table public.workspace_invitations enable row level security;

drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid()) or exists (
      select 1 from public.memberships self
      where self.tenant_id = memberships.tenant_id and self.user_id = (select auth.uid()) and self.role in ('owner','admin')
    )
  );
create policy workspace_invitations_select on public.workspace_invitations for select to authenticated
  using (exists (select 1 from public.memberships m where m.tenant_id = workspace_invitations.tenant_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin')));
grant select on public.workspace_invitations to authenticated;

create or replace function public.create_workspace_invitation(p_tenant_id uuid, p_email text, p_role text)
returns table (invitation_id uuid, invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_expires_at timestamptz := now() + interval '7 days';
  v_id uuid;
begin
  if v_user_id is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.memberships m where m.tenant_id = p_tenant_id and m.user_id = v_user_id and m.role in ('owner','admin')) then raise exception 'workspace_admin_required' using errcode = '42501'; end if;
  if lower(trim(coalesce(p_email, ''))) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_invite_email' using errcode = '22023'; end if;
  if p_role not in ('admin','lead','editor','reviewer','viewer') then raise exception 'invalid_invite_role' using errcode = '22023'; end if;
  v_code := encode(gen_random_bytes(18), 'hex');
  insert into public.workspace_invitations(tenant_id, email, role, invite_code_hash, invited_by, expires_at)
  values (p_tenant_id, lower(trim(p_email)), p_role, encode(digest(v_code, 'sha256'), 'hex'), v_user_id, v_expires_at)
  returning id into v_id;
  return query select v_id, v_code, v_expires_at;
end;
$$;

create or replace function public.accept_workspace_invitation(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invitation public.workspace_invitations;
begin
  if v_user_id is null or v_email = '' then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select * into v_invitation from public.workspace_invitations
  where invite_code_hash = encode(digest(trim(coalesce(p_invite_code, '')), 'sha256'), 'hex')
    and email = v_email and accepted_at is null and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception 'invalid_or_expired_invitation' using errcode = '42501'; end if;
  insert into public.memberships(tenant_id, user_id, role) values (v_invitation.tenant_id, v_user_id, v_invitation.role)
  on conflict (tenant_id, user_id) do nothing;
  update public.workspace_invitations set accepted_by = v_user_id, accepted_at = now() where id = v_invitation.id;
  return v_invitation.tenant_id;
end;
$$;

create or replace function public.revoke_workspace_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  update public.workspace_invitations i set revoked_at = now()
  where i.id = p_invitation_id and i.accepted_at is null and i.revoked_at is null
    and exists (select 1 from public.memberships m where m.tenant_id = i.tenant_id and m.user_id = v_user_id and m.role in ('owner','admin'));
  if not found then raise exception 'invitation_not_found_or_not_allowed' using errcode = '42501'; end if;
end;
$$;

revoke all on function public.create_workspace_invitation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.accept_workspace_invitation(text) from public, anon, authenticated;
revoke all on function public.revoke_workspace_invitation(uuid) from public, anon, authenticated;
grant execute on function public.create_workspace_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated;
