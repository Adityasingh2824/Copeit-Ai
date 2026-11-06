alter table public.workspace_invitations drop constraint workspace_invitations_email_check;
alter table public.workspace_invitations add constraint workspace_invitations_email_check check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$');
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
  if lower(trim(coalesce(p_email, ''))) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid_invite_email' using errcode = '22023'; end if;
  if p_role is null or p_role not in ('admin','lead','editor','reviewer','viewer') then raise exception 'invalid_invite_role' using errcode = '22023'; end if;
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
  v_email text;
  v_invitation public.workspace_invitations;
begin
  select lower(email) into v_email from auth.users where id = v_user_id and email_confirmed_at is not null and not coalesce(is_anonymous,false);
  if v_user_id is null or v_email is null or v_email = '' then raise exception 'sign_in_required' using errcode = '42501'; end if;
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
