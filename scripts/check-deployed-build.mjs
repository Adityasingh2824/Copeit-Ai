import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = process.env.SMOKE_BASE_URL || 'https://copeit-ai.vercel.app';
const local = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const asset = local.match(/src="([^"]+[.]js)"/)?.[1];
assert.ok(asset, 'Build the application before checking the deployment');
const response = await fetch(origin);
assert.equal(response.status, 200, 'Public application must load');
assert.ok((await response.text()).includes(asset), 'Live deployment must match the tested local build');
const javascript = await fetch(new URL(asset, origin));
assert.equal(javascript.status, 200, 'Application JavaScript must load');
assert.ok((await javascript.text()).includes('Download workspace records'), 'Expected the data-management controls');
console.log('PASS: production matches the tested build and serves the workspace data controls');
