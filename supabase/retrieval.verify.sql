-- Replace placeholders and run as two authenticated users after inserting fixtures.
select chunk_id, document_id, title, vector_similarity, hybrid_score
from public.hybrid_search_source_chunks(
  '<tenant-id>'::uuid, 'test question',
  ('[' || array_to_string(array_fill(0.0, array[768]), ',') || ']')::extensions.vector, 8, null
);
-- Expect cross-tenant, disallowed-role, draft, rejected, superseded, future, and expired sources to return zero rows.
