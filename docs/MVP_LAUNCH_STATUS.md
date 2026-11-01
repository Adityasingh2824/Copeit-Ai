# Public workspace MVP — 1 November 2026

Target Supabase project: `aoelyuleereohfflqtuy`.

## Implemented in code

- Public email/password account UI, confirmation instructions, password recovery, mandatory configured Turnstile challenge.
- Verified users can create one private workspace or join using an email-bound invitation.
- Latest migration restores self-service creation with a transaction lock and blocks unverified/anonymous users.
- Restrictive profile policy ensures its product belongs to the same tenant, alongside membership checks.
- Product facts, evidence workflow, preparation journey, tasks, team invitations and offline Ask Cope.
- Production local build targets the new project; Vercel CSP permits that project.

## Production database status

The production connector was restored. The core workspace, invitation, product context, public-source metadata and self-service workspace migrations were applied to `aoelyuleereohfflqtuy`. All public tables have RLS and the project contains no customer rows. Enterprise ingestion and Gemini migrations remain intentionally deferred.

## Deployment status

- Production frontend: `https://copeit-ai.vercel.app`
- Production deployment: `dpl_2uEtS5va3TrVQzdw4naBfPAXEvsq` (`READY`)
- Evidence upload/review function: `index-document` version 1 (`ACTIVE`)
- Ask Cope mode: offline until enterprise RAG acceptance passes
- Auth: email/password signup enabled; email confirmation required; CAPTCHA and leaked-password protection still pending

## Before public MVP release

1. Run live owner/editor/viewer and cross-tenant tests with real verified accounts.
2. Enable leaked-password protection and complete a backup/restore drill.
3. Configure verified email signup, 12-character passwords, custom SMTP, exact confirmation/reset redirects, Turnstile secret and Auth rate limits.
4. Set Vercel production variables: new project URL/publishable key, real Turnstile site key, AI mode offline. Deploy and test confirmation, reset, onboarding, product/context/task persistence and signout with real inboxes.
5. Deploy and test evidence functions/private storage before advertising uploads. PDF/DOCX/OCR and enterprise retrieval remain future work.
6. Configure monitoring, backups and restore drill, support, deletion/export process, and reviewed legal pages. Keep payments disabled.

Enterprise RAG follows the core release: approved official corpus, robust extractors, source refresh/revocation, product applicability, calibrated retrieval, claim-level citation evaluation, injection/isolation tests, quotas and tracing.

Local tests alone do not establish public launch readiness.
