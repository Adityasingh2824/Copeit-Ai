create table if not exists copeit_private.public_ai_daily_usage (
  scope text not null,
  usage_date date not null default (now() at time zone 'UTC')::date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (scope, usage_date)
);
alter table copeit_private.public_ai_daily_usage enable row level security;
revoke all on copeit_private.public_ai_daily_usage from public, anon, authenticated;
grant select, insert, update on copeit_private.public_ai_daily_usage to service_role;
create policy public_ai_daily_service on copeit_private.public_ai_daily_usage for all to service_role using (true) with check (true);
create or replace function public.consume_public_ai_quota(p_user_id uuid)
returns boolean language plpgsql security invoker
set search_path = '' as $$
declare v_global integer; v_user integer; v_date date := (now() at time zone 'UTC')::date;
begin
 if p_user_id is null then return false; end if;
 insert into copeit_private.public_ai_daily_usage(scope,usage_date,request_count)
 values ('global',v_date,1)
 on conflict (scope,usage_date) do update set request_count = copeit_private.public_ai_daily_usage.request_count + 1
 returning request_count into v_global;
 if v_global > 1000 then return false; end if;
 insert into copeit_private.public_ai_daily_usage(scope,usage_date,request_count)
 values ('user:' || p_user_id::text,v_date,1)
 on conflict (scope,usage_date) do update set request_count = copeit_private.public_ai_daily_usage.request_count + 1
 returning request_count into v_user;
 return v_user <= 50;
end; $$;
revoke all on function public.consume_public_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_public_ai_quota(uuid) to service_role;
