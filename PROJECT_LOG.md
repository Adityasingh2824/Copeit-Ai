# Copeit AI project log

Updated: 27 October 2026
## Production readiness review — 27 October 2026, 18:24 IST

**Verdict: NO-GO for production.** The application compiles successfully, but the operational, legal, security, and commercial launch gates are not implemented or cannot be verified from the available repository and connected environment.

### Verified in this review

- `npm run build` passed with Vite 6.4.5: 1,667 modules transformed; generated JavaScript is 445.84 kB (128.14 kB gzip) and CSS is 52.84 kB (12.78 kB gzip).
- The repository has a GitHub origin and a committed-lockfile workflow is possible, but no `.github/workflows` CI/CD definition is present.
- Frontend configuration names are limited to the Supabase URL, publishable key, and Ask Copeit mode. No secret values were recorded in this review.
- The Ask Copeit Edge Function validates origin, bearer session, tenant membership, input type/length, and applies a 20-second Gemini timeout. It has no rate limiter, quota, retry policy, structured request ID/logging, or cost ceiling.
- The schema source enables RLS and contains tenant-aware policies and private audit triggers, but it remains a single bootstrap SQL file rather than versioned staging/production migrations.
- No privacy, terms, cookie, acceptable-use, or AI limitation pages; automated smoke tests; monitoring configuration; backup/restore evidence; billing integration; deployment configuration; or launch runbook were found.

### Checks that did not complete

- `npm audit --omit=dev` failed because the sandbox could not resolve `registry.npmjs.org`; vulnerability status was not re-confirmed.
- Staging/production Supabase, hosting, DNS, TLS, email, monitoring, backup, and billing consoles were not available to this run, so their existence and settings are unconfirmed.

### Launch blockers and required evidence

1. Name the owners and decide pilot scope, hosting/regions, data policy, domain/email, Gemini limits, billing, backup objectives, monitoring/on-call, and legal approvers.
2. Provision isolated staging and production environments and document promotion/rollback access.
3. Add CI/CD, security scans, tests, monitoring/alerts, rate limits/quotas, backup policy, and a completed restore drill.
4. Publish legally reviewed policies and complete staged end-to-end, tenant-isolation, load, rate-limit, failure, rollback, and recovery tests.
5. Create and rehearse the launch runbook; production approval requires evidence for every launch gate in `PROJECT_CHECKLIST.md`.

### Platform watch item

- Supabase announced that legacy CBC-mode TLS 1.2 ciphers will be removed no earlier than 10 November 2026; confirm all supported clients negotiate modern TLS. Supabase is also enforcing explicit Data API exposure for tables, so staging must verify grants as well as RLS before launch.

## Product direction

The six supplied documents are **proposed baselines for validation**, not approved regulatory content. The first build follows their India-to-EU electronics preparation journey. Readiness means workflow completeness only. Copeit does not certify products or decide market access.

## Done

- Read the product, technical, journey, UI/UX, backend, and implementation documents and inspected the supplied logo and React Bits reference.
- Chose a warm ivory, editorial blue, and coral design system matching the UI specification.
- Built the React landing page, sign-in, workspace setup, products, tasks, dashboard, and guard states for unsupplied regulatory/evidence systems.
- Added tenant-scoped Supabase schema with RLS, atomic owner membership creation, versioned product records, and database-owned audit events.
- Verified the production build and checked mobile landing, menu, and sign-in layouts in the browser. Upgraded Vite after an audit finding; `npm install` now reports zero vulnerabilities.
- Fixed the home-to-workspace dead end: the hero and navigation now open a clearly labeled workspace preview without an account. The preview includes sample data and saves product/task changes in this browser only.
- Added stable `#/demo` and `#/login` routes so refresh preserves the chosen screen. Signed-in users whose backend cannot load see a clear recovery screen with a preview action.
- Browser-tested the home-to-preview click, product creation, task completion, sign-in navigation, and reload persistence.
- Added the project-scoped Supabase MCP server to Codex, completed OAuth login, and verified `supabase: connected (20 tools)` through the Codex `/mcp` screen.
- Repaired the signed-in route: `#/workspace` is now stable and a direct unauthenticated visit redirects to `#/login` instead of showing the home page.
- Rebuilt the account screen with clear sign-in, sign-up, reset, and new-password states; email-confirmation guidance; password visibility; and readable errors.
- Made **Ask Copeit** the first workspace view, with a chat interface, prompt suggestions, linked product/task records, an action rail, and mobile layout. Preview chat persists locally. The live schema includes private `chat_messages` protected by RLS.
- Browser-verified the chat answer, record-link navigation, preview persistence, account tab, invalid-credentials feedback from Supabase Auth, and protected-route redirect. Production build passed.
- Prepared an opt-in Gemini Edge Function with server-side key handling, session and tenant checks, a product/task record context, and explicit regulatory abstention. The owner selected Gemini. It is not deployed or enabled yet.
- Fixed recovery navigation so leaving a reset link clears its query state; browser-tested return to sign-in and home. Limited automatic workspace navigation to the actual sign-in route, and validated persisted preview chat data before rendering.
- Added an expired/invalid reset-link state that offers a new link instead of an unusable password form; browser-tested with an invalid recovery URL. Build passed again.
- Removed the signed-out workspace route's home-page flash, added a visible chat thinking state, and supplied recent private conversation context to the prepared Gemini function. Browser-tested direct workspace redirect and a task question; build and Edge Function syntax checks passed.
- Rebuilt the home hero into a warm editorial layout with a contained animated visual panel, centered brand artwork, clearer copy, and consistent CTA hierarchy. Extended scroll-triggered reveal to the platform, workspace, workflow, pricing, and closing sections, with reduced-motion support.
- Verified the new desktop hero visually, observed the platform heading and feature cards appear after scrolling, confirmed the primary CTA still opens `#/demo`, and passed `npm run build`.
- Added the full production checklist to `PROJECT_CHECKLIST.md` and sent it to the authenticated Gmail account on 27 October 2026.
- Designed the private document-ingestion data model: tenant-scoped sources, documents and immutable versions, chunks, model-keyed embeddings, retryable ingestion jobs, human reviews, citations, and versioned exports. Added private `source-documents` and `exports` buckets with tenant-folder RLS.

## In progress

- Live database schema/application verification, once project-level database access is granted. The owner is connecting the owning account.
- Gemini provider setup and a server-side secret, after the owning Supabase account is connected.

## Next

- Apply and verify `supabase/schema.sql` in the supplied Supabase project once project access is available.
- Confirm the pilot manufacturer, qualified regulatory reviewer, and approved source catalog before publishing requirements or accepting confidential evidence. The owner asked to keep the category and representative model generic for now.
- Add private ingestion with scanning, extraction, human confirmation, approved-source retrieval, generated cited chat, versioned Passport exports, and invitation/reviewer flows in later increments.
- Implement the server-side ingestion worker and export builder against the new job tables; browser clients intentionally cannot write chunks, embeddings, citations, jobs, or export artifacts.

## Decisions and limits

- The Codex CLI MCP connection is authenticated, but this running desktop chat has not loaded its new MCP tools. Its Supabase app connector lists four other projects and denies access to `aoelyuleereohfflqtuy`. A read-only API request returned HTTP 404 for `tenants`, confirming the schema is not installed. Live schema/auth verification is pending. Preview data is local browser data, not a live tenant workspace.
- Rechecked the project in the third goal turn: the connector still denies access, and an independent read-only REST check still returns HTTP 404 for `tenants`. Live schema deployment and end-to-end auth remain blocked on connecting the owning project account.
- Ask Copeit currently performs deterministic lookup against visible workspace product and task records. It does not call a generative model or claim approved regulatory advice. Private chat is designed in SQL but cannot be verified live until the project schema is applied.
- The publishable browser key is suitable for client configuration; no service-role key is used.
- The commercial amounts in the PRD are planning hypotheses. The UI labels pricing accordingly.
- Evidence upload and regulatory answers are withheld until the security and expert-review controls in the documents exist.
- Document bytes and generated exports use separate private buckets. Object keys must begin with the tenant UUID; original uploads are append-only from browser clients and are identified by lowercase SHA-256 checksums. A new file creates a new `document_versions` row rather than overwriting an object.
- Source provenance is split between normalized fields (`source_type`, publisher, canonical URI, jurisdiction, authority level) and an extensible `source_metadata` JSON object. Canonical URLs are unique within a tenant when present.
- Ingestion job states are `queued`, `processing`, `retry_wait`, `succeeded`, `failed`, and `cancelled`. Retries are bounded by `max_attempts`; `retry_wait` requires `next_retry_at`, and terminal states require `finished_at`.
- Embeddings are stored per chunk and model using pgvector. Vector width remains unconstrained at the database type level and is recorded in `dimensions` until the production embedding model is selected; a model-specific ANN index should be added only after that choice.
- Reviews attach to immutable document versions and require an explicit reviewer decision. Citations resolve to exact chunks and belong to exactly one chat message or export, keeping generated claims traceable to versioned source text.
- Data API exposure is explicit: tenant members receive read access through RLS; only permitted roles can create source/document/version/review rows. Pipeline-owned chunks, embeddings, ingestion state, citations, exports, and export objects remain server-write-only.
- The project-scoped Supabase connector is now readable and reports an empty `public` schema; this run validated extension availability and advisors but did not deploy the bootstrap schema. The live project remains unchanged pending an explicit staging/application step.

## Helpful input from the owner

1. Who will own and approve the first EU requirement set, and can you share reviewed source records?
2. Should self-service workspace creation be open for early demos or restricted to invited pilot teams?
3. Do you have a preferred hosting region, data retention period, and a staging Supabase project?
4. The owner is connecting the owning Supabase account; recheck connector access, then apply and test the schema.
5. The owner selected Gemini. Configure a Gemini key in Supabase Edge Function secrets after project access is restored; never put it in frontend environment variables.
## RAG kickoff — 27 October 2026

### Decisions

- Confirmed the pilot stays generic electronics for India-to-EU preparation. Copeit supports evidence/workflow readiness and does not certify, interpret law, or decide market access.
- Approved-source classes are official EU sources, permitted harmonised-standard content/metadata, notified-body guidance, and tenant uploads only after a qualified reviewer approves the immutable version.
- Defined the six expected document roles and complete provenance/version metadata in `docs/RAG_KICKOFF.md`. The actual files were not present, so format, checksum, page count, owner, and effective-date inventory remains blocked.
- Added `supabase/rag_schema.sql` for document, immutable version, chunk, 768-dimension embedding, ingestion job, source approval, and answer citation records. RLS is enabled; retrieval exposes approved versions only.
- Selected page-safe PDF chunking, heading/paragraph DOCX citations, row-safe table chunks, and roughly 800-token text chunks with section-local overlap. Full rules are in the kickoff document.
- Selected `gemini-embedding-2` at 768 dimensions. `GEMINI_API_KEY` and optional `GEMINI_EMBEDDING_MODEL` remain server-side Edge Function secrets only.
- Built `supabase/functions/index-document/index.ts`: editor membership check, 25 MB cap, private `rag-quarantine` upload, SHA-256 idempotency, chunking, server-side embedding, progress/error status, and pending approval. The first adapter accepts TXT, Markdown, and CSV; PDF/DOCX extraction remains the next adapter.
- Added `tests/rag-retrieval.test.mjs` covering one cited grounded result and the exact insufficient-evidence response for unapproved/weak evidence.

### Blockers and next actions

- Supply the six requirement files and name their owners/effective dates so the inventory can be completed.
- Connect the owning Supabase project; apply both schemas, create the private `rag-quarantine` bucket, deploy the function, set secrets, and run database advisors plus cross-tenant RLS tests.
- Name the qualified reviewer and approved source catalog before any regulated answer is enabled.
- Choose PDF/DOCX parser, OCR/malware scanning, data region, retention, deletion, and licensed-standard handling.
- Build the query Edge Function and calibrate the provisional 0.72 similarity threshold against a reviewed golden set.


