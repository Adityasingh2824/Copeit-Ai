import test from 'node:test';
import assert from 'node:assert/strict';
import { exportWorkspace } from '../src/workspace-export.js';

function client({ fail = false } = {}) {
  const requests = [];
  return { requests, from(table) {
    let tenant;
    return { select() { return this; }, eq(column, value) { assert.equal(column, 'tenant_id'); tenant = value; return this; },
      order() { return this; }, async range(start, end) {
        requests.push({ table, tenant, start, end });
        if (fail) return { error: { message: 'denied' }, data: null };
        return { data: table === 'products' ? [{ id: 1 }, { id: 2 }, { id: 3 }].slice(start, end + 1) : [], error: null };
      } };
  } };
}

test('workspace export paginates records and scopes every request to the active tenant', async () => {
  const db = client();
  const exported = await exportWorkspace(db, { id: 'workspace-a', name: 'Example' }, 2);
  assert.equal(exported.records.products.length, 3);
  assert.equal(db.requests.filter(r => r.table === 'products').length, 2);
  assert.ok(db.requests.every(r => r.tenant === 'workspace-a'));
  assert.ok(!('workspace_invitations' in exported.records));
});

test('export fails instead of delivering a silently incomplete download', async () => {
  await assert.rejects(exportWorkspace(client({ fail: true }), { id: 'workspace-a' }), /Could not export products/);
});
