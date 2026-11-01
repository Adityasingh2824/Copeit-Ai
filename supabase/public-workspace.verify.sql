-- Read-only production deployment checks. Run after applying migrations.
-- Follow with authenticated two-tenant tests; catalogue checks alone do not
-- prove isolation or email delivery.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'product_profiles';

select
  has_function_privilege('anon', 'public.create_workspace(text)', 'execute') as anon_must_be_false,
  has_function_privilege('authenticated', 'public.create_workspace(text)', 'execute') as authenticated_must_be_true,
  pg_get_functiondef('public.create_workspace(text)'::regprocedure) as deployed_definition;

select p.product_id
from public.product_profiles p
join public.products product on product.id = p.product_id
where p.tenant_id <> product.tenant_id;
-- Above query must return zero rows. Investigate existing mismatches before
-- enabling public users; do not automatically delete existing records.
