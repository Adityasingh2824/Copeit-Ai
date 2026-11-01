import test from 'node:test';
import assert from 'node:assert/strict';
import { DISCOVERY_SCOPES, discoverGoogleEvidence, discoveryConfigured, pickerConfigured, scoreCandidate } from '../src/google-picker.js';

test('discovery configuration requires a client id and numeric project number', () => {
  assert.equal(discoveryConfigured({ clientId: 'client', projectNumber: '123' }), true);
  assert.equal(discoveryConfigured({ clientId: 'client', projectNumber: 'nope' }), false);
  assert.equal(pickerConfigured({ clientId: 'client', apiKey: 'browser-key', projectNumber: '123' }), true);
});

test('candidate scoring is local, bounded and term-led', () => {
  const match = scoreCandidate('Supplier test report and RoHS declaration.pdf');
  assert.ok(match.score > 0 && match.score <= 100);
  assert.ok(match.matches.includes('test report'));
  assert.ok(match.matches.includes('rohs'));
  assert.equal(scoreCandidate('holiday photo.jpg').score, 0);
});

test('automatic discovery requests readonly scopes and returns only candidate metadata', async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  let requestedScope = '';
  try {
    globalThis.window = { google: { accounts: { oauth2: { initTokenClient: options => {
      requestedScope = options.scope;
      return { requestAccessToken: () => options.callback({ access_token: 'temporary-token' }) };
    } } } } };
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer temporary-token');
      const value = String(url);
      if (value.includes('/drive/v3/files')) return { ok: true, json: async () => ({ files: [{ id: 'drive-id', name: 'Supplier EMC test report.pdf', mimeType: 'application/pdf', modifiedTime: '2026-11-01T00:00:00Z' }] }) };
      if (value.includes('/messages?')) return { ok: true, json: async () => ({ messages: [{ id: 'mail-id' }] }) };
      if (value.includes('/messages/mail-id')) return { ok: true, json: async () => ({ payload: { headers: [{ name: 'Subject', value: 'PB-200 certificate' }, { name: 'From', value: 'supplier@example.com' }], parts: [{ filename: 'battery-test-report.pdf', mimeType: 'application/pdf', body: { attachmentId: 'attachment-id' } }] } }) };
      throw new Error(`Unexpected URL ${value}`);
    };
    const result = await discoverGoogleEvidence({ clientId: 'client', projectNumber: '123' });
    assert.equal(requestedScope, DISCOVERY_SCOPES);
    assert.equal(result.drive[0].title, 'Supplier EMC test report.pdf');
    assert.equal(result.gmail[0].title, 'battery-test-report.pdf');
    assert.equal(result.gmail[0].emailSubject, 'PB-200 certificate');
    assert.equal(result.drive[0].content, undefined);
  } finally { globalThis.window = originalWindow; globalThis.fetch = originalFetch; }
});

test('a Gmail failure preserves a useful Drive-only discovery result', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  try {
    globalThis.window = { google: { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken: () => options.callback({ access_token: 'token' }) }) } } } };
    globalThis.fetch = async url => String(url).includes('/drive/v3/files')
      ? { ok: true, json: async () => ({ files: [{ id: '1', name: 'CE declaration.pdf', mimeType: 'application/pdf' }] }) }
      : { ok: false, status: 403 };
    const result = await discoverGoogleEvidence({ clientId: 'client', projectNumber: '123' });
    assert.equal(result.drive.length, 1);
    assert.equal(result.gmail.length, 0);
    assert.match(result.warnings[0], /Gmail/);
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});
