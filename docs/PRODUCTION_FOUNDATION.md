# Production foundation

Status: **staging preparation only**. This document does not authorize a production launch.

## Environments

| Environment | Frontend | Data | AI mode | Purpose |
| --- | --- | --- | --- | --- |
| Staging | Vercel preview (Cloudflare staging retained temporarily) | `qvwipoquhsmmbjquiilz` Supabase project | controlled by deployment configuration, default `offline` | synthetic data and acceptance tests only |
| Production | Protected `copeit-ai.vercel.app` frontend | EU-first Supabase project, not yet connected | `offline` | frontend only; disabled until all production gates pass |

Vercel is the canonical frontend host. Keep Cloudflare's staging Worker only as a temporary rollback/comparison path; do not add a customer production route or domain until the production Supabase project, legal entity, custom domain, and release owner are confirmed.

## GitHub environments and secrets

Create `staging` and `production` environments in GitHub. Configure `production` with a required reviewer, prevent self-review, restrict deployment to `main`, and disable administrator bypass. GitHub environment secrets become available only after protection rules approve the deployment. See the [GitHub environment documentation](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

Set these values per environment. Values named `VITE_*` are browser configuration, not secrets; never put a Supabase secret key, Gemini key, Cloudflare token, Sentry auth token, or customer data in them.

| Name | Where | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | GitHub secret | Least-privilege Worker deployment token for that environment/account |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | Cloudflare account identifier |
| `VITE_SUPABASE_URL` | GitHub environment variable | Exact Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | GitHub environment variable | Public browser key only |
| `VITE_ASK_COPEIT_MODE` | Staging environment variable | `offline` unless a completed staging RAG gate explicitly enables Gemini |
| `VITE_SENTRY_DSN` | GitHub environment variable | Public browser DSN, not an auth token |
| `SMOKE_SUPABASE_URL`, `SMOKE_SUPABASE_PUBLISHABLE_KEY`, `SMOKE_TEST_EMAIL`, `SMOKE_TEST_PASSWORD` | GitHub secrets | Isolated synthetic-account smoke test only |
| `PRODUCTION_URL` | Production environment variable | HTTPS custom domain, required before production deploy |

The deployment workflows call `scripts/write-security-headers.mjs` after each environment build. It writes a deployment-only CSP that permits only that environment's Supabase origin and optional Sentry ingest origin. The checked-in `public/_headers` is staging-safe. Do not enable HSTS until the final HTTPS custom domain is serving correctly; validate it before adding `Strict-Transport-Security`.

## Observability and incident response

- Browser errors: Sentry is disabled until `VITE_SENTRY_DSN` is set. It removes user identity, request headers/body, and high-risk breadcrumb fields before sending events.
- Platform signals: retain Cloudflare Worker observability and Supabase Auth, database, storage, and Edge Function logs. Never log source text, credentials, or full user prompts.
- Initial alerts: failed deployment; staging/production availability failure; client error spike; Supabase auth/function 5xx spike; RAG timeout rate above 1%; and Gemini spend above the approved budget.
- Every incident record must include time, affected environment, impact, mitigation, owner, and follow-up. Customer notification and an external status page are required before general availability.

## Ownership matrix

These roles are intentionally unassigned until the company confirms them. A production deployment is blocked until every role has a named person and a backup contact.

| Responsibility | Named owner | Required before launch |
| --- | --- | --- |
| Release approval and rollback decision | TBD | Yes |
| Privacy, DPIA, and deletion requests | TBD | Yes |
| Security incidents and vulnerability response | TBD | Yes |
| Qualified evidence reviewer | TBD | Yes |
| Customer support and escalation | TBD | Yes |
| Supabase backup/PITR restore drill | TBD | Yes |
| Cloudflare and GitHub environment administration | TBD | Yes |

## Backup, deletion, and release gates

The provisional deletion target is removal of verified-request live customer data within 90 days. Backups may persist until the actual provider retention window expires. Before customer onboarding, record the Supabase plan's backup/PITR coverage, a measured restore drill, RPO/RTO target, restore owner, and backup-retention evidence.

Production requires all of the following:

1. Counsel-approved trust pages with a legal entity name, address, governing jurisdiction, support contact, security contact, and subprocessor/retention details.
2. A named release owner, privacy/security owner, support owner, and qualified reviewer.
3. Custom domain/DNS, SMTP sender, Auth redirects, CAPTCHA/rate limits, exact function origins, and final security headers verified.
4. Completed staging RAG negative tests, evaluation thresholds, tenant-isolation tests, monitoring alerts, backup restore drill, and security review.
5. Dodo merchant onboarding, tax treatment, signed webhook verification, entitlements, and commercial terms before checkout.

## Durable ingestion worker (staging gate)

The migration `20261030071545_rag_durable_ingestion_jobs.sql` and Edge Function `process-ingestion-jobs` add the next ingestion layer: atomic job claims, bounded retries with exponential backoff, dead-letter state, non-content job events, and a worker heartbeat. They are committed as **staging-only implementation** and are not deployed yet.

Before enabling it in staging, set `INGESTION_WORKER_TOKEN` and `GEMINI_API_KEY` only as Edge Function secrets, deploy the function, then create a scheduled authenticated invocation using a Vault-held token. Do not place the worker token, Gemini key, database password, or Supabase secret key in GitHub variables or `VITE_*` values. Verify one approved synthetic source completes, one forced provider failure reaches `retry_wait`, and exhaustion reaches `dead_letter` before switching the UI from synchronous processing to queue-only processing.

The RAG test suite now includes deterministic grounded-citation, abstention, and prompt-injection gates. Live model evaluation remains a staging release gate: record a versioned fixture corpus, expected citations, relevance/abstention thresholds, multilingual coverage, latency percentile, and spend ceiling before enabling AI for pilot users.

## Rollback

1. Stop the release and mark the incident in the release record.
2. Roll back the Cloudflare Worker to the prior known-good version; do not assume that a Worker rollback changes Supabase schema or data.
3. Disable the affected feature flag or set `VITE_ASK_COPEIT_MODE=offline` and redeploy if AI behavior is implicated.
4. Revoke compromised credentials, inspect Sentry/Cloudflare/Supabase logs, and run the staging smoke suite before retrying.
5. Record the cause, customer impact, data impact, decision owner, and prevention action.
