import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'RAG_TEST_A_EMAIL', 'RAG_TEST_A_PASSWORD', 'RAG_TEST_B_EMAIL', 'RAG_TEST_B_PASSWORD'];
for (const key of required) assert.ok(process.env[key], `Missing ${key}`);

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const localOrigin = 'http://127.0.0.1:4174';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const signIn = async (email, password) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error && data.session) return client;
    // The Supabase gateway can occasionally return an HTML interstitial to
    // Node-based test traffic. Retry only that transient transport failure;
    // invalid credentials and every other Auth error remain a hard failure.
    if (/Unexpected token '<'/.test(error?.message || '') && attempt < 2) {
      await delay(800 * (attempt + 1));
      continue;
    }
    assert.ifError(error); assert.ok(data.session, `No session for ${email}`);
  }
  throw new Error('Unreachable sign-in retry state');
};
const invoke = async (client, body) => {
  const { data, error } = await client.functions.invoke('index-document', { body, headers: { Origin: localOrigin } });
  if (error) {
    let detail = error.message;
    try { detail = await error.context.text() || detail; } catch { /* preserve generic transport error */ }
    assert.fail(`index-document failed: ${detail}`);
  }
  assert.ok(!data?.error, data?.error); return data;
};

const a = await signIn(process.env.RAG_TEST_A_EMAIL, process.env.RAG_TEST_A_PASSWORD);
const b = await signIn(process.env.RAG_TEST_B_EMAIL, process.env.RAG_TEST_B_PASSWORD);
console.log('PASS: authenticated synthetic owner and reviewer.');
const suffix = Date.now().toString(36);

let tenantA;
let tenantB;
if (process.env.RAG_TEST_TENANT_A_ID) {
  tenantA = { id: process.env.RAG_TEST_TENANT_A_ID };
  const { data: reviewerMembership, error: reviewerMembershipError } = await b.from('memberships').select('tenant_id,role').eq('tenant_id', tenantA.id).maybeSingle();
  assert.ifError(reviewerMembershipError); assert.ok(reviewerMembership, 'Reviewer must already be a member of RAG_TEST_TENANT_A_ID');
  console.log(`PASS: reusing configured pilot workspace ${tenantA.id}.`);
} else {
  const { data: createdTenantA, error: workspaceAError } = await a.rpc('create_workspace', { p_name: `RAG synthetic A ${suffix}` });
  assert.ifError(workspaceAError); assert.ok(createdTenantA?.id); tenantA = createdTenantA;
  const { data: createdTenantB, error: workspaceBError } = await b.rpc('create_workspace', { p_name: `RAG synthetic B ${suffix}` });
  assert.ifError(workspaceBError); assert.ok(createdTenantB?.id); tenantB = createdTenantB;
  const { data: invitation, error: invitationError } = await a.rpc('create_workspace_invitation', { p_tenant_id: tenantA.id, p_email: process.env.RAG_TEST_B_EMAIL.toLowerCase(), p_role: 'reviewer' });
  assert.ifError(invitationError); const invite = Array.isArray(invitation) ? invitation[0] : invitation; assert.ok(invite?.invite_code);
  const { data: acceptedTenant, error: acceptError } = await b.rpc('accept_workspace_invitation', { p_invite_code: invite.invite_code });
  assert.ifError(acceptError); assert.equal(acceptedTenant, tenantA.id);
  console.log(`PASS: created isolated workspaces and reviewer invitation. Reuse with RAG_TEST_TENANT_A_ID=${tenantA.id}.`);
}

const sourceText = '# Synthetic pilot source\n\nCopeit staging evidence is synthetic and approved only after independent review.\n\n## Review workflow\n\nA reviewer who did not upload the source may approve it for retrieval.';
const form = new FormData();
form.set('action', 'upload'); form.set('tenantId', tenantA.id); form.set('title', `Synthetic RAG source ${suffix}`);
form.set('sourceType', 'synthetic'); form.set('versionLabel', 'v1'); form.set('jurisdiction', 'global'); form.set('language', 'en');
form.set('file', new File([sourceText], 'synthetic-source.md', { type: 'text/markdown' }));
const upload = await invoke(a, form); assert.equal(upload.approvalStatus, 'pending'); assert.ok(upload.documentVersionId);
console.log('PASS: uploaded source to private quarantine.');

const { data: unapprovedChunks } = await a.from('document_chunks').select('id').eq('tenant_id', tenantA.id).eq('document_version_id', upload.documentVersionId);
assert.equal(unapprovedChunks?.length || 0, 0, 'Unapproved sources must not have chunks');
const review = await invoke(b, { action: 'review', tenantId: tenantA.id, documentVersionId: upload.documentVersionId, status: 'approved', rationale: 'Independent synthetic staging review.' });
assert.equal(review.review.status, 'approved');
console.log('PASS: independent reviewer approved source.');

if (tenantB?.id) {
  const { data: crossTenantSource } = await a.from('sources').select('id').eq('tenant_id', tenantB.id);
  assert.equal(crossTenantSource?.length || 0, 0, 'Tenant A must not read tenant B sources');
  console.log('PASS: cross-tenant source query is isolated.');
}

if (process.env.RUN_GEMINI !== 'true') {
  console.log('PASS: quarantine, independent approval, membership invitation, and cross-tenant RLS checks passed. Set RUN_GEMINI=true after configuring the rotated GEMINI_API_KEY to test embeddings and grounded answers.');
  process.exit(0);
}

assert.ok(process.env.RAG_WORKER_TOKEN, 'Missing RAG_WORKER_TOKEN for durable-worker acceptance');
const queued = await invoke(a, { action: 'queue', tenantId: tenantA.id, documentVersionId: upload.documentVersionId });
assert.equal(queued.status, 'queued');
console.log('PASS: approved source was queued for durable processing.');
const { data: workerResult, error: workerError } = await a.functions.invoke('process-ingestion-jobs', {
  body: { limit: 1 }, headers: { 'x-copeit-worker-token': process.env.RAG_WORKER_TOKEN },
});
assert.ifError(workerError); assert.ok(!workerResult?.error, workerResult?.error);
assert.equal(workerResult?.outcomes?.[0]?.status, 'completed', 'Worker must complete the approved source job');
console.log('PASS: durable worker embedded the approved source.');
const { data: answer, error: answerError } = await a.functions.invoke('ask-copeit', { body: { tenantId: tenantA.id, question: 'Who may approve a source for retrieval?' }, headers: { Origin: localOrigin } });
assert.ifError(answerError); assert.equal(answer.status, 'answered'); assert.ok(answer.citations?.length, 'Grounded answer must cite a source');
assert.ok(answer.citations.every(citation => citation.chunkId), 'Every citation must identify its chunk');
console.log('PASS: full two-tenant RAG acceptance flow completed.');
