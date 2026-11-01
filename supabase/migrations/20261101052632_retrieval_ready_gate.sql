-- Exclude partially embedded versions from retrieval during processing/retry.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.search_approved_chunks(uuid,text,extensions.vector,integer,uuid)'::regprocedure) into definition;
  if position('and dv.extraction_status = ''ready''' in definition) = 0 then
    definition := replace(definition, 'and s.retrieval_eligible', 'and dv.extraction_status = ''ready'' and s.retrieval_eligible');
    if position('and dv.extraction_status = ''ready''' in definition) = 0 then raise exception 'retrieval_definition_not_recognized'; end if;
    execute definition;
  end if;
end $$;
