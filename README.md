# Copeit AI

An early UI and tenant-safe workspace foundation for the India-to-EU electronics preparation journey described in the six supplied project documents.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. A publishable key belongs in the browser; never use a service-role or secret key there.

## Set up the database

Apply [supabase/schema.sql](supabase/schema.sql) to a **new or staging** Supabase project using its SQL Editor. The SQL creates tenant, membership, product, immutable product version, task, private chat message, and append-only audit tables, with row-level security. It automatically creates the owner membership when a tenant is created. Do not run the full file twice: its policies are intended for a fresh project.

In Supabase Auth settings, choose the email verification and redirect URL policy for the pilot. Add the local and eventual deployed URLs, including `http://localhost:5173/**`, `http://127.0.0.1:4174/**`, and the deployed origin, to the redirect allowlist. Confirm a custom SMTP sender before production email flows. Supabase currently requires email confirmation for this project.

The **Preview workspace** button on the home page opens `#/demo` without sign-in. Sample products, tasks, and chat messages stay in this browser through local storage. The live flow provides sign-up, sign-in, password recovery, workspace creation, products, tasks, and private chat history after the SQL schema is applied. The `#/workspace` route requires a session. If live workspace data cannot load, signed-in users get a clear recovery screen with a preview option.

**Ask Copeit** currently answers from recorded product and task fields, links to those records, and declines product-specific regulatory conclusions. It is a workflow guide, not a connected generative model. A reviewed source catalog, server-side AI provider credentials, and retrieval/answer evaluation are needed before generated compliance analysis can be enabled. Confidential evidence upload, exports, invitations, and billing are also pending their controls. See [PROJECT_LOG.md](PROJECT_LOG.md) for progress and decisions.

The optional [Gemini Edge Function](supabase/functions/ask-copeit/index.ts) is prepared for workspace and approved-source questions. Apply [supabase/retrieval.sql](supabase/retrieval.sql) after the base schema, populate only reviewed sources/chunks, and run [supabase/retrieval.verify.sql](supabase/retrieval.verify.sql) with controlled cross-tenant fixtures. The retrieval function uses caller-scoped RLS, role filters, current/approved-source filters, lexical/vector reciprocal-rank fusion, and a configurable minimum vector similarity. Answers use structured output, validate citations against retrieved chunk IDs, and abstain when evidence is missing or citations are invalid.

For production, set `GEMINI_API_KEY` and `COPEIT_ALLOWED_ORIGINS` as **Supabase Edge Function secrets**. Optional server-only settings are `GEMINI_MODEL` (default `gemini-3.5-flash-lite`), `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-2`), `COPEIT_MIN_VECTOR_SIMILARITY` (default `0.62`), and `COPEIT_RETRIEVAL_LIMIT` (default `8`). Deploy with `supabase functions deploy ask-copeit`, test the live function with two tenants and multiple roles, then set `VITE_ASK_COPEIT_MODE=gemini` and rebuild. Keep every Gemini value out of `VITE_` variables. Until schema, secrets, retrieval evaluation, and live tenant-isolation tests pass, leave the mode at `lookup`.

## Checks

```powershell
npm run build
npm audit --omit=dev
```

## RAG pilot

The kickoff design is in [docs/RAG_KICKOFF.md](docs/RAG_KICKOFF.md). The prepared schema is [supabase/rag_schema.sql](supabase/rag_schema.sql), and the first ingestion Edge Function is [supabase/functions/index-document/index.ts](supabase/functions/index-document/index.ts). It requires a private ag-quarantine bucket plus server-side GEMINI_API_KEY and GEMINI_EMBEDDING_MODEL=gemini-embedding-2 secrets. Uploaded versions remain unavailable to retrieval until reviewed and approved.

