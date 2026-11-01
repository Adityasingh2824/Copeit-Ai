import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('public onboarding requires verified users and serializes the one-workspace limit', async () => {
  const migration = await read('supabase/migrations/20261101044435_public_workspace_launch.sql');
  assert.match(migration, /email_confirmed_at is not null/i);
  assert.match(migration, /email_confirmation_required/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /workspace_limit_reached/i);
  assert.match(migration, /grant execute on function public\.create_workspace\(text\) to authenticated/i);
  assert.doesNotMatch(migration, /grant execute.*to public/i);
});

test('onboarding supports workspace creation and invitation acceptance', async () => {
  const onboarding = await read('src/WorkspaceOnboarding.jsx');
  assert.match(onboarding, /can_provision_workspace/);
  assert.match(onboarding, /Join by invitation/);
  assert.match(onboarding, /accept_workspace_invitation/);
  assert.match(onboarding, /rpc\('create_workspace'/);
});

test('product profiles enforce the product tenant alongside membership policies', async () => {
  const migration = await read('supabase/migrations/20261101044435_public_workspace_launch.sql');
  assert.match(migration, /as restrictive for all to authenticated/i);
  assert.match(migration, /p\.tenant_id = product_profiles\.tenant_id/);
  assert.match(migration, /with check/);
});

test('auth UI is Turnstile-ready and does not expose server secrets', async () => {
  const auth = await read('src/AuthPage.jsx');
  const captcha = await read('src/Turnstile.jsx');
  assert.match(auth, /captchaToken/);
  assert.match(auth, /captchaConfigured/);
  assert.match(auth, /signUp\([\s\S]*captchaToken/);
  assert.match(auth, /signInWithPassword\([\s\S]*captchaToken/);
  assert.match(auth, /auth\.resend\(/);
  assert.match(auth, /invalid_credentials/);
  assert.match(auth, /Reset this password/);
  assert.match(captcha, /VITE_TURNSTILE_SITE_KEY/);
  assert.doesNotMatch(auth, /service_role|GEMINI_API_KEY|SUPABASE_SECRET_KEY/);
});
