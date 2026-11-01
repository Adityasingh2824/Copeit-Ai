# Controlled pilot release gate

Status: NOT RELEASED. Production Ask Cope must remain offline.

## Current verification — 1 November 2026

- One short CE-marking excerpt is admitted to the shared corpus. The independent reviewer confirmed its wording and reuse with attribution; the publication date is unknown and 1 November 2026 is the retrieval date.
- In the local frontend connected to production, a CE question returned a cited Gemini answer and an unsupported power-bank certification question returned insufficient evidence. This is a limited smoke test, not a qualified evaluation.
- The `Test 1` tenant's server-side pilot flag is enabled. The public Vercel frontend remains offline; two-tenant HTTP/API acceptance and release gates below remain outstanding.
- Local changes add a product-facts-needed response and workspace lookup routing. These changes are not yet deployed or live-tested.

## Historical verification snapshot

- Production `Test 1` has a verified owner and independent reviewer. Gmail SMTP is enabled; a real reviewer confirmation and invitation acceptance occurred.
- At the time of this snapshot, the CE marking excerpt's licence note and publication date still needed correction. The current verification above supersedes this point.
- The official source completed ingestion with one `gemini-embedding-2` vector. A direct SQL retrieval with that stored vector returned the source for its tenant and zero for a different tenant identifier. This was not a full model-generated answer test.
- A rollback-only RLS transaction created a temporary second identity, workspace and synthetic source. Each owner could see its own source and neither could see the other workspace's source; all fixtures were rolled back. This is not a full live HTTP/API isolation or concurrency test.
- Privileged retrieval and embedding tables remain unavailable to authenticated browser roles. Synthetic evidence is excluded from official retrieval. Full citation accuracy, freshness/revocation, scheduled retry, and real two-account end-to-end tests remain unverified; the limited Gemini smoke tests are recorded above.
- Security advisor still reports leaked-password protection disabled and six authenticated SECURITY DEFINER functions requiring review. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.

## Implementation record — 1 November 2026

- Staging applied: durable queue, tenant feature flags, controlled owner provisioning, source provenance, product context, and ready-only retrieval gate.
- Staging deployed: index-document v10, process-ingestion-jobs v1, ask-copeit v10. All three rejected unauthenticated POST requests with HTTP 401.
- Production applied: controlled_pilot_launch. Direct authenticated tenant creation and browser provisioner inserts are denied; anonymous create_workspace is denied.
- Owner supplied by user: adityasingh852005@gmail.com, already verified and added to the production provisioner allowlist. Reviewer: adityasingh35781@gmail.com, not registered in production yet. No invitation email has been sent.
- Local validation: auth 4/4, RAG 8/8 and production build passed. These tests are not live two-account acceptance.
- Production worker, Ask Cope, remaining RAG migrations and model activation are deferred until staging acceptance. No official corpus has been admitted. SMTP/domain, Turnstile, Sentry, legal review, restore drill and signed acceptance remain pending.

Approved scope: 3–5 invited exporters; official public evidence and structured product facts; payments disabled; confidential customer files excluded.

## Required operator configuration

- Set custom SMTP and verified sender DNS in Supabase, exact confirmation/reset redirect URLs, 12-character server password policy, leaked-password protection and Auth rate limits.
- Configure Turnstile in Supabase and its public site key in Vercel. Test signup, recovery and resend using two independent real inboxes.
- Set Gemini and worker credentials only as Edge Function secrets. Confirm available model identifiers with the provider before enabling them.
- Configure Sentry DSN, test a redacted error event, and assign alerts.
- Provision explicitly approved owner user IDs in `workspace_provisioners` through a privileged operator. Never grant browser INSERT rights to that table. No owner is automatically selected from existing accounts.
- Enable `rag_pilot` only after acceptance for the named tenant. Registration alone does not grant workspace access.

## Acceptance evidence required

Record dated results and reviewer identity for: owner signup/confirmation/recovery, owner provision, reviewer invitation, invalid/expired/reused/wrong-email invitation rejection, two-tenant isolation, product persistence, independent source approval, queued ingestion, retries/dead letter, revoked-source exclusion, grounded answers/abstention, injection and rate-limit rejection.

Unit tests do not establish live acceptance. Do not enable Gemini based only on local test results.

## Corpus admission

Use the existing public source register as a review queue. Each normalized official source needs canonical URL, authority, immutable version, effective status, article/section/page, licence decision, checksum, retrieval date, applicability and renewal date. A human reviewer must approve these facts and the text before retrieval. No source has been admitted merely by adding its URL to a register.

## Release and rollback

Commit reviewed changes and record the commit, database migration ledger, Edge Function versions and corpus version. Reconcile local migration version numbers with remote ledgers before using `db push`; never replay the full directory blindly.

Vercel production workflow stages with `--skip-domain`. After protected browser and API acceptance, promote that exact deployment. Record the previous production deployment as the rollback target. Disable the tenant feature flag and return the frontend to offline mode for an AI incident.

Legacy Cloudflare production workflow is callable-only and is not the release path. Keep Vercel production and staging Supabase variables separate; current Vercel preview variables still require separation from production.

## External gates

Counsel-approved policies, verified support/security contacts, export/deletion process, administrator MFA/second owner, backup restoration and rollback drill, two pilot-user walkthroughs and named release approval are required. None is satisfied by documentation alone.
