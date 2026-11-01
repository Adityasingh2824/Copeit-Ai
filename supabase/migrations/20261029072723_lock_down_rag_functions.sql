-- Explicitly remove inherited function execution privileges before role-specific grants.
revoke all on function public.create_workspace(text) from public, anon, authenticated;
revoke all on function public.submit_source_review(uuid, text, text) from public, anon, authenticated;
revoke all on function public.store_chunk_embedding(uuid, uuid, text, extensions.vector) from public, anon, authenticated;
revoke all on function public.consume_rag_rate_limit(uuid, uuid, integer) from public, anon, authenticated;

grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.submit_source_review(uuid, text, text) to authenticated;
grant execute on function public.store_chunk_embedding(uuid, uuid, text, extensions.vector) to service_role;
grant execute on function public.consume_rag_rate_limit(uuid, uuid, integer) to service_role;

create policy rag_rate_windows_service_only on public.rag_rate_windows
  for all to service_role using (true) with check (true);
