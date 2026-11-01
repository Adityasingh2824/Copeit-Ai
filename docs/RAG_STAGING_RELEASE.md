# RAG staging release sequence

Target: `qvwipoquhsmmbjquiilz` only. Do not apply this sequence to production.

## 1. Authenticate and verify the target

Run `npx supabase login`, then confirm the project appears in `npx supabase projects list`. Use a scoped token that is limited to this staging project. Confirm the project reference before every mutation.

## 2. Apply the canonical migration history

Apply the existing migrations in timestamp order, including `20261030105644_rag_public_source_metadata.sql`. This adds official-source provenance and makes retrieval depend on the explicit retrieval-eligibility flag.

Run database advisors and the two-tenant SQL verification after migration. Do not continue if RLS, function-execution, or private-schema findings are unresolved.

### Current staging record (2026-10-30)

`20261030105644_rag_public_source_metadata.sql` was applied to the isolated staging database through the Supabase SQL Editor and returned success. Because dashboard SQL execution does not update the Supabase CLI migration ledger, reconcile the ledger with the exact canonical migration history before the next CLI-driven deployment. Do not re-run the DDL blindly.

## 3. Configure server-only function secrets

Set these as Edge Function secrets in staging only:

- `GEMINI_API_KEY` — newly rotated key
- `INGESTION_WORKER_TOKEN` — long random worker-only secret
- `COPEIT_ALLOWED_ORIGINS` — exact staging and approved local origins
- Optional controls: `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `COPEIT_MIN_VECTOR_SIMILARITY`, `COPEIT_RETRIEVAL_LIMIT`

Never set any of these as `VITE_*` values or commit them locally.

## 4. Deploy and schedule functions

Deploy `index-document`, `process-ingestion-jobs`, and `ask-copeit` to the verified staging project. Schedule the worker with a server-held token; do not let the browser invoke it. The browser can only queue an approved source.

## 5. Run controlled acceptance

Create two verified synthetic users and set their values only in ignored `.env.rag-test.local`. Run `npm run test:rag:staging` once to create an isolated tenant and reviewer membership. Record the printed `RAG_TEST_TENANT_A_ID`.

As the release operator, enable server-side `rag_pilot` only for that exact synthetic tenant. Add its ID as `RAG_TEST_TENANT_A_ID`, set `RUN_GEMINI=true` and `RAG_WORKER_TOKEN` in the ignored test file, then rerun the acceptance test.

Success requires quarantine upload, independent approval, queue processing, worker embedding, cited answer, and tenant isolation. Keep `VITE_ASK_COPEIT_MODE=offline` until this passes.

## 6. Seed reviewed public sources

Use [RAG_PUBLIC_SOURCE_REGISTER.md](RAG_PUBLIC_SOURCE_REGISTER.md) as the founder-review queue. Verify each live official source and permitted-use status, upload only a small UTF-8 extraction with provenance metadata, and have a different verified account approve it. Do not mark a candidate retrievable from the register alone.

## 7. Enable a pilot tenant only

After evaluation and acceptance results are recorded, enable `rag_pilot` for one non-customer pilot tenant and deploy a build with `VITE_ASK_COPEIT_MODE=gemini`. Roll back by disabling the tenant flag and redeploying with `offline` mode.
