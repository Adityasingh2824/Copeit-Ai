import assert from 'node:assert/strict';
import test from 'node:test';
import { groundedAnswer, sanitizeSearchQuery, isOfficialUrl, publisherUrl, researchWeb, providerDiagnostic } from '../supabase/functions/ask-copeit/web-search.js';

test('quota diagnostics retain only safe operational fields', () => {
  const result = providerDiagnostic({ error: { message: 'Grounding requires a paid tier. private-question secret-key', details: [
    { violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_requests', quotaValue: '0', quotaId: 'RequestsPerDay', description: 'private-question' }] },
    { retryDelay: '30s' },
  ] } }, 429, 'search', 'test');
  assert.equal(result.reason, 'billing_or_tier');
  assert.equal(result.retryAfterSeconds, 30);
  assert.equal(result.quotas[0].period, 'day');
  assert.doesNotMatch(JSON.stringify(result), /private-question|secret-key/);
});

const payload = (url = 'https://europa.eu/guidance') => ({ candidates: [{ content: { parts: [{ text: 'A declaration records conformity. Unsupported conclusion.' }] }, groundingMetadata: {
  webSearchQueries: ['EU declaration of conformity'], groundingChunks: [{ web: { uri: url, title: 'Guidance' } }],
  groundingSupports: [{ segment: { text: 'A declaration records conformity.' }, groundingChunkIndices: [0] }],
  searchEntryPoint: { renderedContent: '<div>Google Search</div>' },
} }] });

test('web answers require real grounding, citations and attribution', async () => {
  const answer = await groundedAnswer(payload(), true, async url => url);
  assert.equal(answer.answerOrigin, 'web_search');
  assert.equal(answer.refs[0].official, true);
  assert.doesNotMatch(answer.answer, /Unsupported conclusion/);
  const forged = payload();
  forged.candidates[0].groundingMetadata.groundingSupports[0].groundingChunkIndices = [99];
  assert.equal(await groundedAnswer(forged, false), null);
  assert.equal(await groundedAnswer({ candidates: [] }, false), null);
});

test('regulatory research rejects nonofficial and deceptive domains', async () => {
  assert.equal(isOfficialUrl('https://europa.eu.evil.test/page'), false);
  assert.equal(await groundedAnswer(payload('https://example.com'), true, async url => url), null);
  assert.ok(await groundedAnswer(payload('https://example.com'), false, async url => url));
});

test('public queries remove identifiers, private product fields and secrets', () => {
  const query = sanitizeSearchQuery('EU rules for SecretProduct contact user@example.com 00000000-0000-0000-0000-000000000000 https://private.test token_abcdefghijklmnopqrstuvwxyz', ['SecretProduct']);
  assert.doesNotMatch(query, /SecretProduct|@|00000000|private.test|token_/);
});

test('publisher resolution never fetches arbitrary publisher or internal URLs', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw Error('unexpected'); };
  assert.equal(await publisherUrl('http://127.0.0.1', fetcher), null);
  assert.equal(await publisherUrl('https://europa.eu/page', fetcher), 'https://europa.eu/page');
  assert.equal(calls, 0);
});

test('one grounded call follows a sanitized private planning call, failures propagate', async () => {
  const bodies = [];
  const fetcher = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return { ok: true, json: async () => bodies.length === 1 ? { candidates: [{ content: { parts: [{ text: '{"query":"EU declaration of conformity"}' }] } }] } : payload() };
  };
  assert.ok(await researchWeb({ apiKey: 'test', model: 'test', question: 'What is an EU declaration of conformity?', fetcher }));
  assert.equal(bodies.filter(body => body.tools).length, 1);
  assert.equal(bodies[1].contents[0].parts[0].text, 'EU declaration of conformity');
  await assert.rejects(researchWeb({ apiKey: 'test', model: 'test', question: 'test', fetcher: async () => ({ ok: false, status: 429 }) }), /web_provider_429/);
});
