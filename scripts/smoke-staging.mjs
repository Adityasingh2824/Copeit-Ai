import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const required = ['SMOKE_BASE_URL', 'SMOKE_SUPABASE_URL', 'SMOKE_SUPABASE_PUBLISHABLE_KEY', 'SMOKE_TEST_EMAIL', 'SMOKE_TEST_PASSWORD'];
for (const key of required) assert.ok(process.env[key], `Missing ${key}`);

const baseUrl = process.env.SMOKE_BASE_URL.replace(/\/$/, '');
const app = await fetch(baseUrl, { redirect: 'error' });
assert.equal(app.status, 200, `Expected staging page, received ${app.status}`);
assert.match(await app.text(), /Copeit AI/i, 'Staging page did not render the app shell');

const signedOut = await fetch(`${process.env.SMOKE_SUPABASE_URL}/functions/v1/ask-copeit`, {
  method: 'POST', headers: { Origin: baseUrl, 'content-type': 'application/json' }, body: JSON.stringify({}),
});
assert.equal(signedOut.status, 401, `Expected signed-out Ask Copeit request to be rejected, received ${signedOut.status}`);

const client = createClient(process.env.SMOKE_SUPABASE_URL, process.env.SMOKE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data, error } = await client.auth.signInWithPassword({ email: process.env.SMOKE_TEST_EMAIL, password: process.env.SMOKE_TEST_PASSWORD });
assert.ifError(error);
assert.ok(data.session, 'Expected the synthetic smoke account to receive a session');
const { data: user, error: userError } = await client.auth.getUser();
assert.ifError(userError);
assert.equal(user.user.email?.toLowerCase(), process.env.SMOKE_TEST_EMAIL.toLowerCase());
console.log('PASS: staging public page, signed-out function boundary, and synthetic-account authentication.');
