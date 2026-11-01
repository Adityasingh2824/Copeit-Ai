import test from 'node:test';
import assert from 'node:assert/strict';
import { isWorkspaceLookup, needsProductSelection } from '../supabase/functions/ask-copeit/question-routing.js';

test('only explicit workspace lookups bypass official source retrieval', () => {
  assert.equal(isWorkspaceLookup('What products are in this workspace?'), true);
  assert.equal(isWorkspaceLookup('What needs attention next?'), true);
  assert.equal(isWorkspaceLookup('What products require CE marking?'), false);
});

test('product-specific export questions require a selected product', () => {
  assert.equal(needsProductSelection('What certificates does my power bank need?', null), true);
  assert.equal(needsProductSelection('What certificates does my power bank need?', 'product-id'), false);
  assert.equal(needsProductSelection('Do all products require CE marking?', null), false);
});
