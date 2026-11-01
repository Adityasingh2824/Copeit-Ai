-- Cover foreign keys used during user deletion, tenant cleanup and joins.
create index if not exists product_profiles_updated_by_idx on public.product_profiles(updated_by);
create index if not exists rag_answer_audits_user_idx on public.rag_answer_audits(user_id);
create index if not exists rag_rate_windows_user_idx on public.rag_rate_windows(user_id);
create index if not exists source_review_events_actor_idx on public.source_review_events(actor_id);
create index if not exists work_items_created_by_idx on public.work_items(created_by);
create index if not exists work_items_tenant_product_idx on public.work_items(tenant_id, product_id);
create index if not exists workspace_invitations_accepted_by_idx on public.workspace_invitations(accepted_by);
create index if not exists workspace_invitations_invited_by_idx on public.workspace_invitations(invited_by);
