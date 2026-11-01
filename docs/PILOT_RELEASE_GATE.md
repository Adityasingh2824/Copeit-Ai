# Controlled pilot release gate

Status: NOT RELEASED. Production Ask Cope must remain offline.

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
