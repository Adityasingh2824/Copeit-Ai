import assert from 'node:assert/strict';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, 'Load a deployment env file containing public Supabase configuration');
const headers = { apikey: key, 'content-type': 'application/json' };
const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers });
assert.equal(settingsResponse.status, 200, 'Auth settings must be reachable');
const settings = await settingsResponse.json();
assert.equal(settings.disable_signup, false, 'Public signup is disabled');
assert.equal(settings.external?.email, true, 'Email authentication is disabled');
assert.equal(settings.mailer_autoconfirm, false, 'Email verification must be enabled');
console.log('PASS: public signup, email authentication, and email verification settings');

const provision = await fetch(`${url}/rest/v1/rpc/create_workspace`, {
  method: 'POST', headers, body: JSON.stringify({ p_name: 'Must never be created' }),
});
assert.ok([401, 403].includes(provision.status), `Anonymous workspace creation returned ${provision.status}`);
console.log('PASS: anonymous workspace creation denied');

for (const fn of ['ask-copeit', 'index-document']) {
  const response = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST', headers: { ...headers, Origin: process.env.SMOKE_BASE_URL || 'https://copeit-ai.vercel.app' },
    body: '{}',
  });
  assert.ok([401, 403].includes(response.status), `${fn}: signed-out request returned ${response.status}`);
  console.log(`PASS: ${fn} signed-out boundary`);
}

if (process.env.SMOKE_BASE_URL) {
  const response = await fetch(process.env.SMOKE_BASE_URL);
  assert.equal(response.status, 200, 'Public site must load');
  assert.match(await response.text(), /Copeit AI/i);
  console.log('PASS: public application shell');
}
console.log('This check does not test email delivery or signed-in browser flows.');
