import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const { data, error } = await client.auth.signInWithPassword({ email: process.env.RAG_TEST_A_EMAIL, password: process.env.RAG_TEST_A_PASSWORD });
  assert.ok(!error && data.session, `Synthetic test sign-in failed (${error?.code || error?.status || 'no session'})`);
  console.log('PASS: synthetic-account production sign-in');
  const refreshed = await client.auth.refreshSession();
  assert.ok(!refreshed.error && refreshed.data.session, 'Session refresh failed');
  console.log('PASS: session refresh');
  const memberships = await client.from('memberships').select('tenant_id,role').eq('user_id', data.user.id);
  assert.ifError(memberships.error);
  assert.ok(memberships.data.length, 'Test account needs a workspace');
  const tenantId = memberships.data[0].tenant_id;
  for (const table of ['products', 'work_items', 'sources', 'product_profiles']) {
    const result = await client.from(table).select('*', { head: true, count: 'exact' }).eq('tenant_id', tenantId);
    assert.ifError(result.error);
    console.log(`PASS: authenticated ${table} read`);
  }
  const capabilities = await client.functions.invoke('ask-copeit', { body: { tenantId, action: 'capabilities' }, headers: { Origin: 'https://copeit-ai.vercel.app' } });
  assert.ifError(capabilities.error);
  assert.equal(capabilities.data?.regulatoryAnswers, true, 'AI capability must be enabled');
  console.log('PASS: AI availability');
  const answer = await client.functions.invoke('ask-copeit', { body: { tenantId, question: 'Is CE marking mandatory for every product?' }, headers: { Origin: 'https://copeit-ai.vercel.app' } });
  assert.ifError(answer.error);
  assert.ok(['answered', 'insufficient_evidence'].includes(answer.data?.status), 'Expected a grounded answer or abstention');
  if (answer.data.status === 'answered') assert.ok(answer.data.citations?.length && answer.data.refs?.length, 'Answer must include citations');
  console.log(`PASS: generated-answer flow (${answer.data.status})`);
} finally {
  await client.auth.signOut({ scope: 'local' });
}
