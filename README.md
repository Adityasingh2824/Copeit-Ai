# Copeit AI

Copeit AI is a tenant-isolated workspace for preparing electronics products for market entry. It brings product records, requirements, evidence, tasks, audit history, and grounded AI guidance into one workflow for teams moving from an India-origin product definition toward EU readiness. It is workflow assistance, not a substitute for qualified regulatory or legal review.

> **Project status:** active pilot foundation. The UI, authentication flow, tenant-aware schema, retrieval design, ingestion functions, and evaluation fixtures are in place. Production launch still requires live Supabase migration verification, approved source ownership, deployed secrets, end-to-end RAG evaluation, and operational/compliance sign-off.

## Product capabilities

- Responsive landing page, preview workspace, and scroll-reveal product storytelling.
- Supabase email authentication, password recovery, sessions, and protected workspace routes.
- Tenant/workspace model with memberships, roles, products, immutable product versions, tasks, private chat, and append-only audit records.
- Row-level security policies designed to prevent cross-tenant access.
- Ask Copeit lookup mode with an optional Gemini Edge Function for grounded answers.
- RAG foundation for source documents, versions, chunks, embeddings, review states, citations, and ingestion quarantine.
- Retrieval verification SQL, deterministic retrieval tests, and a starter golden set.

## Architecture

```text
React + Vite browser
        |
        | Supabase Auth / client calls
        v
Supabase Postgres + RLS + Storage
        |
        +-- ask-copeit Edge Function
        |      retrieval -> Gemini generation -> citation validation
        |
        +-- index-document Edge Function
               quarantine -> extraction/chunking -> embeddings -> review
```

The browser may contain only publishable configuration. Gemini keys, embedding keys, service-role credentials, retrieval thresholds, and allowed-origin settings belong in server-side Edge Function secrets.

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

The optional [Gemini Edge Function](supabase/functions/ask-copeit/index.ts) is prepared for workspace and approved-source questions. Apply [supabase/rag_schema.sql](supabase/rag_schema.sql) after the base schema, populate only reviewed sources/chunks, and run [supabase/retrieval.verify.sql](supabase/retrieval.verify.sql) with controlled cross-tenant fixtures. The retrieval function uses caller-scoped RLS, role filters, current/approved-source filters, lexical/vector reciprocal-rank fusion, and a configurable minimum vector similarity. Answers use structured output, validate citations against retrieved chunk IDs, and abstain when evidence is missing or citations are invalid.

For production, set `GEMINI_API_KEY` and `COPEIT_ALLOWED_ORIGINS` as **Supabase Edge Function secrets**. Optional server-only settings are `GEMINI_MODEL` (default `gemini-3.5-flash-lite`), `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-2`), `COPEIT_MIN_VECTOR_SIMILARITY` (default `0.62`), and `COPEIT_RETRIEVAL_LIMIT` (default `8`). Deploy with `supabase functions deploy ask-copeit`, test the live function with two tenants and multiple roles, then set `VITE_ASK_COPEIT_MODE=gemini` and rebuild. Keep every Gemini value out of `VITE_` variables. Until schema, secrets, retrieval evaluation, and live tenant-isolation tests pass, leave the mode at `lookup`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | React application, routes, UI components, styling, and Supabase client |
| `public/` | Static brand assets |
| `supabase/schema.sql` | Core tenant, product, task, chat, and audit schema |
| `supabase/rag_schema.sql` | RAG source, chunk, embedding, review, and quarantine schema |
| `supabase/retrieval.sql` | Retrieval functions and policies |
| `supabase/retrieval.verify.sql` | SQL verification and tenant-isolation checks |
| `supabase/functions/` | Server-side ingestion and grounded-answer functions |
| `docs/RAG_KICKOFF.md` | RAG implementation decisions and pilot plan |
| `evals/` | Golden questions and evaluation guidance |
| `tests/` | Automated retrieval tests |
| `PROJECT_CHECKLIST.md` | Production readiness checklist |
| `PROJECT_LOG.md` | Decisions, completed work, blockers, and next actions |

## Prerequisites

- Node.js 20 LTS or newer and npm 10 or newer
- A Supabase project for development/staging
- Supabase CLI for migrations and Edge Functions
- A Gemini API key for generated answers and embeddings (server-side only)

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

For live auth and workspace data, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ASK_COPEIT_MODE=lookup` in `.env.local`. Never place a Supabase service-role key, Gemini key, or other secret in a `VITE_` variable. Local `.env` files are ignored by Git.

## Database and function deployment

Apply the SQL scripts to a new or staging project in this order: `supabase/schema.sql`, `supabase/rag_schema.sql`, `supabase/retrieval.sql`, then `supabase/retrieval.verify.sql` in a controlled test environment. Convert these scripts into reviewed, versioned migrations before production.

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy index-document
supabase functions deploy ask-copeit
```

Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `COPEIT_ALLOWED_ORIGINS`, `COPEIT_MIN_VECTOR_SIMILARITY`, and `COPEIT_RETRIEVAL_LIMIT` as Edge Function secrets. Keep `VITE_ASK_COPEIT_MODE=lookup` until reviewed sources, citation validation, function deployment, and tenant-isolation tests pass; then switch the deployed frontend to `gemini`.

## Security and data handling

- Retrieval is caller-scoped and enforced with Supabase RLS.
- Only current, reviewed, approved sources should be eligible for production answers.
- Generated answers must cite retrieved chunk IDs; missing or invalid evidence must produce an abstention.
- Uploaded documents are untrusted input: validate type/size, scan files, isolate processing, and redact personal data where required.
- Configure Auth redirects, SMTP, storage policies, backups, monitoring, rate limits, and security headers before launch.
- Product-specific regulatory conclusions require qualified human review.

## Checks and release gate

```powershell
npm run build
npm run test:rag
npm audit --omit=dev
```

Before release, run `supabase/retrieval.verify.sql` against disposable staging data with at least two tenants and multiple roles. Confirm that no tenant can retrieve another tenant's products, documents, chunks, or chat history. Complete [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md) before production deployment.

## Contributing

Use short-lived branches and focused pull requests. Keep secrets out of commits, add tests for retrieval or authorization changes, and record meaningful decisions in `PROJECT_LOG.md`. A change is not production-ready until its migration impact, RLS behavior, failure mode, and rollback path are understood.

## Legal notice

No open-source license has been selected yet; until the repository owner adds one, all rights are reserved. Before public launch, publish Terms of Service, Privacy Policy, acceptable-use rules, data-retention policy, and support contact details after legal review. Copeit AI provides workflow and research assistance only; users remain responsible for source licensing, product compliance, professional advice, and regulatory submissions.

## RAG pilot

The kickoff design is in [docs/RAG_KICKOFF.md](docs/RAG_KICKOFF.md). The prepared schema is [supabase/rag_schema.sql](supabase/rag_schema.sql), and the first ingestion Edge Function is [supabase/functions/index-document/index.ts](supabase/functions/index-document/index.ts). It requires a private ag-quarantine bucket plus server-side GEMINI_API_KEY and GEMINI_EMBEDDING_MODEL=gemini-embedding-2 secrets. Uploaded versions remain unavailable to retrieval until reviewed and approved.

