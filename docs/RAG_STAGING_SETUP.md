# RAG staging setup

## Canonical staging implementation — 29 October 2026

- Confirmed the active target is the separate staging project `qvwipoquhsmmbjquiilz` (`https://qvwipoquhsmmbjquiilz.supabase.co`). No production mutation was made in this implementation block.
- Applied `canonical_workspace_rag` and `lock_down_rag_functions`. The canonical model now includes atomic workspace creation, `work_items`, source-review events, answer audits, request-rate windows, product model/intended-use fields, and server-only embedding writes.
- Browser clients can no longer write source, version, ingestion, review, or storage objects directly. The `index-document` Edge Function owns quarantine upload, review, approved processing, private embedding storage, and short-lived approved-source downloads.
- Staging accepts only synthetic or permitted public TXT/Markdown/CSV sources below 1 MB. Customer uploads, DOCX/PDF parsing, OCR, scanning, crawling, and connectors remain explicitly disabled.
- Deployed `index-document` and `ask-copeit` to staging. Both authorize a user session in the function, use the modern publishable/secret key environment variables when available, and retain legacy-key fallback only for transition.
- Verified that anonymous callers cannot execute workspace creation, review, embedding-write, or rate-limit RPCs; authenticated callers can only create workspaces/review through functions that validate `auth.uid()` and tenant role; only `service_role` can write embeddings.
- `npm run test:rag` passed (4 tests) and `npm run build` passed. The Supabase security advisor now reports only the expected authenticated `SECURITY DEFINER` notices for the two user-facing RPCs; both have explicit authorization checks and no anonymous execution.

### Remaining live gate

Gemini is deliberately not configured because the key previously pasted into chat must be rotated. Add a newly generated key as `GEMINI_API_KEY` in **staging Supabase Dashboard → Edge Functions → Secrets**, then run the synthetic two-tenant acceptance suite before any production promotion. Never place that key in a Vite variable, source file, Git, or chat.

The complete operator sequence is in [STAGING_ACCEPTANCE_RUNBOOK.md](STAGING_ACCEPTANCE_RUNBOOK.md). It covers secure Auth settings, synthetic two-user fixtures, the automated end-to-end test, and browser verification.

Status: staging project `qvwipoquhsmmbjquiilz` was verified through MCP and the three foundation migrations were applied. Production `aoelyuleereohfflqtuy` also contains the earlier mistakenly applied versions; its membership policy differs and needs a separately reviewed correction. Always verify the target URL before remote changes.

2026-10-29 follow-up: staging's membership policy was corrected before applying the foundation. Rolled-back two-user tests confirmed tenant A sees its own tenant, membership, and source but not tenant B's tenant or source. Storage, role-mutation, approval, and retrieval isolation tests are still needed. The existing ingestion function targets an earlier schema and cannot yet write to this foundation. No end-to-end RAG deployment has been verified. The staging security advisor reported no findings, and only service_role can execute the retrieval function.

Access check (2026-10-29): the connected Supabase account lists the AlgoEase organization, but does not list the Copeit production project. The owning organization and a staging project therefore need to be connected before provisioning or database verification.

The staging management API denied project, table, and migration inspection. The staging Auth endpoint returned HTTP 200 with the supplied publishable key, confirming the local client configuration can reach it. A publishable key cannot authorize schema management. Local development can use `npm run dev:staging` and the ignored `.env.staging.local`; the example file contains no secret. Do not deploy until the project identity and region are verified through owner access.

## Intended environment

- Project: `copeit-ai-rag-staging`, region `ap-south-1`.
- Corpus: synthetic or approved public, non-confidential English material only.
- The six planning documents are not regulatory evidence and are not retrieval eligible.
- Gemini credentials belong only in server-side secrets. Never commit secrets.

## Before applying SQL

The repository currently contains incompatible definitions of `documents`, `document_versions`, and `ingestion_jobs` in `supabase/schema.sql` and `supabase/rag_schema.sql`. `supabase/retrieval.sql` defines another retrieval model. Do not apply these files together. Reconcile the schema and functions into a tested, versioned migration before deployment.

The current security-invoker retrieval functions reference `chunk_embeddings`, but authenticated users do not have SELECT permission on that table. Resolve and test this access model without exposing embeddings before enabling retrieval.

## Provisioning and release gates

1. Connect the Supabase organization that owns Copeit AI and provision the separate staging project. Confirm any project charges before accepting them.
2. Verify its project reference and region, and configure isolated Auth, environment variables and server secrets.
3. Create and test the canonical migration on an empty disposable database. Provision private storage with tenant-scoped access.
4. Test two-tenant isolation, role permissions, approval and revocation, including direct API and storage access.
5. Add synthetic fixtures, ingestion and grounded retrieval; evaluate citations, abstention, injection resistance and cost.
6. Review security, retention and legal requirements before any customer data or production promotion.

## Completed on 2026-10-29

- Applied `rag_staging_foundation`, `rag_staging_hardening`, and `rag_server_retrieval` to the project that the active connection later identified as production; the earlier staging claim was incorrect.
- Created RLS-protected tenant, membership, product, source, immutable document version, review, chunk, job, and citation tables.
- Created private `rag-quarantine` and `rag-approved` buckets for TXT, Markdown, and CSV staging fixtures.
- Kept embeddings in the private `copeit_private` schema. The `search_approved_chunks` RPC is executable by `service_role` only; anonymous and authenticated callers cannot execute it.
- Resolved database security-advisor findings for RLS and function execution. Supabase still reports that leaked-password protection is disabled and it should be enabled in the dashboard.
