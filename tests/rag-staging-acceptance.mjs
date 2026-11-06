import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'RAG_TEST_A_EMAIL', 'RAG_TEST_A_PASSWORD', 'RAG_TEST_B_EMAIL', 'RAG_TEST_B_PASSWORD'];
for (const key of required) assert.ok(process.env[key], `Missing ${key}`);

const url = process.env.VITE_SUPABASE_URL;
assert.equal(new URL(url).origin, 'https://qvwipoquhsmmbjquiilz.supabase.co', 'This suite writes fixtures and must target staging');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const expectedUrl = process.env.RAG_TEST_OFFICIAL_URL;
if (process.env.RUN_GEMINI === 'true') assert.ok(expectedUrl, 'Set RAG_TEST_OFFICIAL_URL to the admitted CE guidance URL');
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
const suffix = crypto.randomUUID();

let tenantA;
let tenantB;
if (process.env.RAG_TEST_TENANT_A_ID) {
  tenantA = { id: process.env.RAG_TEST_TENANT_A_ID };
  assert.ok(process.env.RAG_TEST_TENANT_B_ID, 'Set RAG_TEST_TENANT_B_ID when reusing workspaces');
  tenantB = { id: process.env.RAG_TEST_TENANT_B_ID };
  assert.notEqual(tenantA.id, tenantB.id);
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
  console.log(`PASS: created isolated workspaces and reviewer invitation. Reuse with RAG_TEST_TENANT_A_ID=${tenantA.id} and RAG_TEST_TENANT_B_ID=${tenantB.id}.`);
}

const sourceText = `# Synthetic pilot source\n\nFixture ID: ${suffix}\n\nCopeit staging evidence is synthetic and approved only after independent review.\n\n## Review workflow\n\nA reviewer who did not upload the source may approve it for retrieval.`;
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
  const { data: product, error: productError } = await b.from('products').insert({
    tenant_id: tenantB.id, name: `Isolation fixture ${suffix}`, model: 'STAGING-ONLY', category: 'Synthetic electronics',
    created_by: (await b.auth.getUser()).data.user.id,
  }).select('id').single();
  assert.ifError(productError);
  const { data: crossTenantProduct, error: isolationError } = await a.from('products').select('id').eq('id', product.id);
  assert.ifError(isolationError);
  assert.deepEqual(crossTenantProduct, [], 'Tenant A must not read a known product in tenant B');
  const { error: askDenied } = await a.functions.invoke('ask-copeit', { body: { tenantId: tenantB.id, productId: product.id, question: 'What do we know about this product?' }, headers: { Origin: localOrigin } });
  assert.equal(askDenied?.context?.status, 403, 'Ask Cope must deny access to tenant B');
  const { error: capabilitiesDenied } = await a.functions.invoke('ask-copeit', {
    body: { action: 'capabilities', tenantId: tenantB.id }, headers: { Origin: localOrigin },
  });
  assert.equal(capabilitiesDenied?.context?.status, 403, 'Ask Cope must hide capability state from nonmembers');
  console.log('PASS: cross-tenant product query and Ask Cope access are isolated.');
}

if (process.env.RUN_GEMINI !== 'true') {
  console.log('PASS: synthetic quarantine, separate-account review, and cross-tenant API checks passed. Gemini acceptance requires an admitted official source.');
  process.exit(0);
}

const ask = async question => {
  const { data, error } = await a.functions.invoke('ask-copeit', { body: { tenantId: tenantA.id, question }, headers: { Origin: localOrigin } });
  assert.ifError(error);
  return data;
};
const { data: capabilities, error: capabilityError } = await a.functions.invoke('ask-copeit', {
  body: { action: 'capabilities', tenantId: tenantA.id }, headers: { Origin: localOrigin },
});
assert.ifError(capabilityError);
assert.equal(capabilities?.regulatoryAnswers, true, 'Enable the staging pilot flag and configure Gemini for tenant A');
const answer = await ask('Is the CE mark mandatory for every kind of product sold in Europe?');
assert.equal(answer.status, 'answered');
assert.ok(answer.citations?.length, 'Grounded answer must cite a source');
assert.ok(answer.refs?.some(ref => ref.url === expectedUrl && ref.section), 'Expected an official CE citation with a section locator');
assert.equal((await ask('Which documents does my product need for the EU market?')).status, 'needs_product_facts');
const unsupported = await ask('What is the serial number on the fictional ZX-732 prototype sitting on my desk?');
assert.equal(unsupported.status, 'insufficient_evidence');
assert.deepEqual(unsupported.citations, []);
console.log('PASS: official citation, missing facts, and abstention checks completed.');
