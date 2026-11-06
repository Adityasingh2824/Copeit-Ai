import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error: authError } = await db.auth.signInWithPassword({ email: process.env.RAG_TEST_A_EMAIL, password: process.env.RAG_TEST_A_PASSWORD });
assert.ifError(authError);
const { data: memberships, error } = await db.from('memberships').select('tenant_id').eq('user_id', auth.user.id).limit(1);
assert.ifError(error);
assert.ok(memberships?.[0]);
for (const question of ['What is the purpose of an EU Declaration of Conformity?', 'Why is the sky blue?']) {
  const { data, error: issue } = await db.functions.invoke('ask-copeit', { body: { tenantId: memberships[0].tenant_id, question } });
  if (issue) {
    let detail;
    try { detail = await issue.context.json(); } catch {}
    throw new Error(JSON.stringify({ error: issue.message, detail }));
  }
  console.log(JSON.stringify({ question, status: data.status, origin: data.answerOrigin, references: data.refs?.map(ref => ref.url), attribution: Boolean(data.searchAttribution), uncertainty: data.uncertainty }));
  assert.equal(data.status, 'answered');
  assert.ok(data.refs?.length);
  if (data.answerOrigin === 'web_search') assert.ok(data.searchAttribution);
}
const denied = await db.functions.invoke('ask-copeit', { body: { action: 'capabilities', tenantId: '00000000-0000-0000-0000-000000000000' } });
assert.equal(denied.error?.context?.status, 403);
console.log('PASS: cross-workspace access denied');
await db.auth.signOut();
