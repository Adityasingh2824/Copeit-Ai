# Staging acceptance runbook

Use this runbook only with the isolated staging Supabase project `qvwipoquhsmmbjquiilz`. Production remains frozen.

## 1. Secure the credentials

1. Revoke the Gemini credential that was shared in chat and create a replacement in Google AI Studio.
2. In **Supabase Dashboard → Edge Functions → Secrets** for staging, set `GEMINI_API_KEY` and a long random `INGESTION_WORKER_TOKEN`. Do not put either value in a Vite variable, Git, or chat.
3. Set `COPEIT_ALLOWED_ORIGINS` to the exact staging frontend URL(s). Local testing may temporarily include `http://127.0.0.1:5173` and `http://127.0.0.1:4174`.
4. Enable Supabase Auth's leaked-password protection. It is currently the only non-code security warning reported by the staging advisor.
5. Create a Cloudflare Turnstile managed widget for the exact Vercel staging hostname. Put only its site key in `VITE_TURNSTILE_SITE_KEY`; add its secret under **Authentication → Bot and Abuse Protection** in Supabase. The secret must never be committed or shared in chat.

## 2. Configure staging authentication

In **Authentication → Providers / URL Configuration / Security**, set and verify:

- Email confirmation enabled.
- A 12+ character password policy and leaked-password protection.
- Exact local and staging redirect URLs for sign-up and password recovery.
- Password reset email template and a working reset link.
- CAPTCHA and sensible sign-up/rate limits before public testing.
- Short session lifetime and refresh-token rotation suitable for the pilot.

Create two **synthetic** users with verified email addresses. Provision both as synthetic workspace owners using the service-only step below. User A owns tenant A; user B owns tenant B and independently reviews tenant A after accepting A's invitation. Never use customer documents or personal data in this stage.

## Invite-only pilot workspace

The final migration, `20261031120000_restore_invite_only_workspace_provisioning.sql`, supersedes the earlier public-prototype rule. A confirmed browser account cannot create a workspace unless a service-only operator has first added it to `workspace_provisioners`; the browser onboarding screen accepts invitation codes only.

For each synthetic owner, use a service-role administrative workflow to add the verified Auth user ID before the first workspace creation:

```sql
insert into public.workspace_provisioners (user_id, created_by)
values ('<verified-owner-auth-user-id>', '<release-operator-auth-user-id>')
on conflict (user_id) do nothing;
```

Do not run that statement with a browser publishable key, and do not add reviewers to `workspace_provisioners`. The acceptance script creates the two synthetic workspaces through the restricted RPC after their owners are provisioned; reviewer B joins tenant A using A's single-use invitation.

## 3. Run acceptance checks

Create an ignored local file named `.env.rag-test.local`:

```dotenv
VITE_SUPABASE_URL=https://qvwipoquhsmmbjquiilz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_staging_publishable_key
RAG_TEST_A_EMAIL=synthetic-owner@example.test
RAG_TEST_A_PASSWORD=replace-with-test-password
RAG_TEST_B_EMAIL=synthetic-reviewer@example.test
RAG_TEST_B_PASSWORD=replace-with-test-password
RUN_GEMINI=true
RAG_WORKER_TOKEN=the-same-staging-worker-token
```

Then, in PowerShell:

```powershell
Get-Content .env.rag-test.local | ForEach-Object {
  if ($_ -match '^(?<name>[^#=]+)=(?<value>.*)$') { Set-Item -Path "Env:$($matches.name)" -Value $matches.value }
}
npm run test:rag:staging
```

The first test run creates synthetic tenants and prints `RAG_TEST_TENANT_A_ID=...`. It verifies invitation acceptance, uploader/reviewer separation, quarantine-before-approval, and cross-tenant source isolation. It intentionally leaves the synthetic records in staging for inspection.

For the full Gemini check, enable the **server-side** `rag_pilot` flag for that exact synthetic tenant using the restricted release-operator procedure, add the printed ID as `RAG_TEST_TENANT_A_ID` in the ignored local test file, and run the command again. The second run verifies queueing, durable worker processing, embeddings, and grounded citations. Never add a browser-accessible switch for this flag.

## 4. Browser acceptance

Keep `VITE_ASK_COPEIT_MODE=offline` while the test is running. Once every automated check passes:

1. Use the Evidence page to upload a synthetic Markdown source as User A.
2. Accept an owner-issued reviewer invitation as User B and approve the source with a rationale.
3. Queue the approved source as User A, verify its processing state updates after the worker runs, and verify a short-lived download works.
4. Ask a question that is answered by the source; verify source, section, and citation are displayed.
5. Ask an unsupported question; it must return `insufficient_evidence`.
6. Verify rejected, revoked, superseded, and other-tenant sources never appear in results.
7. Only then set `VITE_ASK_COPEIT_MODE=gemini`, rebuild, and repeat the browser check.

## Known intentional advisor notices

The staging advisor lists five `SECURITY DEFINER` functions executable by `authenticated`. These are intentionally limited self-service RPCs: workspace creation, invitation create/accept/revoke, and independent source review. Each validates the signed-in user and tenant role internally, has a fixed `search_path`, and is revoked from `anon`/`PUBLIC`. They still require formal security review before production.

