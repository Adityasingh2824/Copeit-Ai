# Copeit AI production checklist

Updated: 27 October 2026

Legend: `[x]` complete, `[~]` in progress or prepared, `[ ]` remaining.
## Production readiness review — 27 October 2026, 18:24 IST

**Launch decision: NO-GO.** The local production build passes, but the repository does not contain enough evidence to confirm a safe staging or production launch.

- [x] Local production build completed successfully with Vite 6.4.5 (`npm run build`; 445.84 kB JavaScript, 128.14 kB gzip).
- [~] Frontend environment variable names are documented and local Supabase client configuration exists; this does not prove isolated staging and production projects, secrets, or deployed configuration.
- [ ] Confirm separate staging and production frontend hosts, Supabase projects, regions, environment variables, and promotion owners.
- [ ] Add and pass CI/CD checks for install, build, tests, dependency/secret scanning, preview deployment, staging promotion, production approval, and rollback.
- [ ] Record the production domain; verify DNS ownership, certificate chain/renewal, HTTPS redirects, HSTS, CSP, security headers, and allowed Supabase/Auth/Edge Function origins.
- [ ] Configure monitoring for frontend errors, Supabase Auth/Database/Edge Functions, availability, latency, and AI spend; assign alert destinations and on-call owners.
- [ ] Document backup/PITR coverage and retention, then complete a timestamped restore drill with measured RPO/RTO and an owner sign-off.
- [ ] Implement and test per-user, per-tenant, and global rate limits plus quotas, abuse controls, request-size limits, and Gemini cost ceilings. The Edge Function currently has input length and a 20-second upstream timeout, but no rate limiter.
- [ ] Decide billing provider or merchant-of-record, plans, trial, entitlements, taxes, refunds, cancellation, failed-payment handling, and billing owner before enabling paid access.
- [ ] Publish legally reviewed Privacy Policy, Terms, cookie notice, acceptable-use policy, AI limitations, subprocessors, retention/deletion, and contact details; no corresponding pages are present in the app.
- [ ] Create and run automated staging smoke tests for signup/signin/recovery, tenant isolation, workspace CRUD, Ask Copeit, failure states, deletion/export, and signout. Upload/index/retrieval/citation/export scenarios remain unavailable because those features are not implemented.
- [ ] Create a launch runbook covering release approval, migrations, rollback, smoke tests, monitoring, incident contacts, status communications, support triage, and post-launch review.
- [ ] Complete the owner decisions listed below and record the decision maker and date.

### Remaining owner decisions

1. Named launch owner, engineering owner, privacy/security owner, support owner, and qualified regulatory reviewer.
2. First pilot customer/product, target markets, approved source catalog, and acceptance criteria.
3. Hosting provider, staging/production Supabase projects, deployment regions, data residency, retention, and deletion/export policy.
4. Public domain, DNS owner, transactional-email sender/domain, and incident/status communication channels.
5. Gemini production model and budget, feature enablement gate, rate limits, tenant quotas, and human-review policy.
6. Billing approach, plans/limits, trial, taxes, refunds, cancellation, and go-live date.
7. Backup tier, RPO/RTO targets, restore-drill owner, monitoring vendor, alert thresholds, and on-call rota.
8. Legal counsel approval for privacy, terms, cookies, AI disclosures, DPDP/GDPR/DPA, and subprocessors.

### Review limitations

- The repository has no test script or automated test files; the build is the only executable local release check currently available.
- `npm audit --omit=dev` could not reach the npm advisory endpoint during this review, so dependency vulnerability status is unverified.
- Live Supabase, deployment host, DNS, TLS, monitoring, backup, billing, and alerting accounts were not accessible from this workspace; all require owner-supplied evidence or connected project access.
- Supabase's current changelog notes upcoming removal of legacy TLS 1.2 cipher suites and enforcement of explicit Data API table exposure. Validate supported clients and table grants during staging verification.

## 1. Product and scope

- [x] Product, technical, user journey, UI/UX, backend, and implementation documents reviewed.
- [x] Generic electronics pilot scope selected for the first UI.
- [x] Product positioning defined: evidence and workflow preparation, not certification or legal advice.
- [ ] Confirm first pilot product category, model, target markets, and launch owner.
- [ ] Define the approved source catalog and the qualified regulatory reviewer.
- [ ] Agree workspace roles: owner, editor, reviewer, viewer, external collaborator.
- [ ] Approve workspace limits, pricing, billing provider, trial rules, and support process.
- [ ] Approve data region, retention period, deletion policy, and customer export policy.

## 2. Frontend and UX

- [x] React/Vite landing page, authentication, preview workspace, dashboard, products, tasks, settings, and Ask Copeit views built.
- [x] Copeit logo and branded color system integrated.
- [x] Hyperspeed visual panel and Crosshair interaction integrated.
- [x] Responsive navigation and mobile layouts implemented.
- [x] Scroll-triggered reveal animation added with reduced-motion support.
- [x] Home-to-preview and protected workspace navigation verified.
- [ ] Add production loading, empty, error, and offline states to every data view.
- [ ] Add keyboard navigation, focus states, screen-reader labels, contrast checks, and touch testing.
- [ ] Add privacy policy, terms, cookie notice, acceptable-use, and AI limitation pages.
- [ ] Add account deletion, data export, notification preferences, and consent controls.
- [ ] Run browser QA on Chrome, Edge, Safari, Firefox, iOS, and Android breakpoints.

## 3. Authentication and authorization

- [x] Supabase Auth client and sign-in, sign-up, reset, recovery, and protected route flows implemented.
- [x] Tenant membership and role-aware schema policies prepared.
- [ ] Apply the schema to the target Supabase project and verify it live.
- [ ] Configure email templates, sender domain, redirect URLs, rate limits, CAPTCHA, and MFA policy.
- [ ] Add invitation and reviewer onboarding flows.
- [ ] Add session revocation, device/session management, and account deletion.
- [ ] Test authorization with owner, editor, reviewer, viewer, removed member, and cross-tenant accounts.

## 4. Database and storage

- [x] Tenant, membership, product, product version, task, chat message, and audit event schema prepared.
- [x] RLS policies, ownership trigger, indexes, and audit design prepared in `supabase/schema.sql`.
- [ ] Apply migrations to staging and production through versioned migration files.
- [ ] Add document, document version, source, chunk, embedding, ingestion job, review, citation, and export tables.
- [ ] Add storage buckets with private access, signed URLs, size/type limits, and retention cleanup.
- [ ] Enable pgvector and validate vector indexes and hybrid search queries.
- [ ] Configure backups, point-in-time recovery, restore drills, and migration rollback procedures.
- [ ] Add database monitoring, slow-query alerts, connection pooling, and capacity thresholds.

## 5. Document ingestion and RAG corpus

- [ ] Define accepted file types, URL policies, source ownership, language support, and maximum sizes.
- [ ] Upload to a quarantine bucket and run malware and content safety scanning.
- [ ] Extract text from PDF, DOCX, XLSX, HTML, images, and scanned documents with OCR.
- [ ] Preserve page, section, table, figure, heading, and source URL metadata.
- [ ] Normalize text, remove repeated headers/footers, detect duplicates, and calculate checksums.
- [ ] Split by document structure with semantic chunking and bounded token sizes.
- [ ] Generate Gemini embeddings server-side and store model/version metadata.
- [ ] Index chunks with tenant, product, market, language, source type, version, effective date, and review status filters.
- [ ] Support re-indexing, deletion propagation, source replacement, and stale-version invalidation.
- [ ] Add human review before a source becomes retrievable for regulated answers.
- [ ] Create an ingestion job queue with retries, idempotency, progress, dead-letter handling, and admin visibility.
- [ ] Build a source registry with owner, authority, jurisdiction, effective date, supersession, and approval history.

## 6. Retrieval and generation

- [ ] Implement query classification: record lookup, source-grounded question, unsupported legal/regulatory request, or out of scope.
- [ ] Apply tenant and document permissions before retrieval.
- [ ] Run metadata filtering, keyword search, vector search, hybrid fusion, and optional reranking.
- [ ] Set minimum relevance thresholds and return “insufficient evidence” when they are not met.
- [ ] Pass only approved, current chunks into Gemini with structured context boundaries.
- [ ] Require source citations with document, version, page/section, URL, and retrieval timestamp.
- [ ] Generate structured answers with assumptions, evidence, uncertainty, and next actions.
- [ ] Prevent the model from treating uploaded content as instructions or secrets.
- [ ] Add prompt injection, data exfiltration, tool abuse, and cross-tenant leakage protections.
- [ ] Add streaming, cancellation, token budgets, timeouts, retries, and user-visible failure states.
- [ ] Keep Gemini keys in server-side Supabase Edge Function secrets; never expose them in the frontend.

## 7. AI quality and evaluation

- [ ] Create a representative golden question set with expected sources and acceptable answers.
- [ ] Measure recall@k, precision@k, MRR/nDCG, citation correctness, groundedness, refusal accuracy, latency, and cost.
- [ ] Test tables, OCR errors, conflicting versions, stale sources, multilingual content, and long documents.
- [ ] Run adversarial tests for prompt injection, jailbreaks, poisoned documents, and tenant isolation.
- [ ] Add regression evaluation to CI for retrieval and generation changes.
- [ ] Add reviewer feedback, answer rating, correction capture, and dataset versioning.
- [ ] Define release gates for retrieval quality, hallucination rate, citation coverage, latency, and spend.

## 8. Backend and operations

- [x] Ask Copeit Edge Function skeleton prepared with session, tenant, product/task context, and Gemini integration point.
- [ ] Deploy and verify the Edge Function in staging.
- [ ] Add structured logging, tracing, request IDs, audit events, and privacy-safe error reporting.
- [ ] Add rate limits, quotas, abuse detection, request size limits, and per-tenant cost controls.
- [ ] Add background workers for ingestion, embedding, exports, notifications, and cleanup.
- [ ] Add health checks, alerts, incident runbooks, and status communication.
- [ ] Add feature flags for Gemini, RAG, uploads, reviewer approval, and billing.
- [ ] Document API contracts, error codes, webhook handling, and service dependencies.

## 9. Security, privacy, and compliance

- [ ] Threat model the browser, API, database, storage, ingestion pipeline, RAG layer, and admin tools.
- [ ] Complete OWASP review for auth, injection, XSS, CSRF, SSRF, file uploads, secrets, and dependency risk.
- [ ] Encrypt data in transit and at rest; rotate secrets and restrict service roles.
- [ ] Complete tenant isolation, object access, signed URL, and deletion verification tests.
- [ ] Define personal data inventory, processing purposes, subprocessors, retention, deletion, export, and breach response.
- [ ] Obtain legal review for Terms, Privacy Policy, DPDP/GDPR obligations, DPA, subprocessors, and AI disclosures.
- [ ] Add dependency scanning, secret scanning, SAST, DAST, and infrastructure review to CI.
- [ ] Run an independent security review before handling confidential customer evidence.

## 10. Billing and commercial readiness

- [ ] Choose billing provider and merchant-of-record approach.
- [ ] Define plans, entitlements, usage meters, taxes, invoices, refunds, cancellation, and failed-payment behavior.
- [ ] Implement server-side checkout and webhook signature verification.
- [ ] Enforce plan limits for seats, storage, pages, embeddings, retrievals, and model usage.
- [ ] Add billing portal, invoices, usage display, and admin reconciliation.

## 11. Deployment and launch

- [ ] Choose final host and configure staging and production environments.
- [ ] Add environment variables through the host secret manager.
- [ ] Configure custom domain, DNS, TLS, security headers, CSP, redirects, and caching.
- [ ] Set up Git-based CI/CD with preview, staging, production promotion, and rollback.
- [ ] Verify build, bundle size, source maps, runtime logs, analytics, and Web Vitals.
- [ ] Run staging smoke tests: signup, workspace creation, upload, indexing, retrieval, cited answer, export, deletion, and signout.
- [ ] Run load, concurrency, rate-limit, backup-restore, and disaster-recovery drills.
- [ ] Create launch runbook, support playbook, incident contacts, and post-launch review schedule.

## Current status

The UI, preview workspace, authentication screens, Supabase schema design, RAG/ingestion plan, Gemini function skeleton, and scroll animation are prepared. The main production blockers are live Supabase migration access, approved source content and reviewer ownership, the real ingestion and embedding pipeline, Gemini secret/deployment, security/compliance review, evaluation, billing, and production deployment verification.

## Today: RAG kickoff agenda

- [x] Confirm the first RAG pilot scope: generic electronics, target market, and approved source types.
- [~] Inventory the six supplied requirement documents: roles and metadata defined; actual files are not present.
- [x] Design the document, version, chunk, embedding, ingestion job, source approval, and citation tables.
- [x] Choose the first extraction and chunking rules for PDF, DOCX, tables, headings, and page citations.
- [x] Prepare the Gemini embedding configuration as a server-side secret contract (value still required).
- [~] Build the first ingestion path: TXT/Markdown/CSV implemented; PDF/DOCX adapters and live deployment remain.
- [x] Build one grounded retrieval test with citations and an insufficient-evidence response.
- [x] Record decisions, blockers, and next actions in `PROJECT_LOG.md`.


