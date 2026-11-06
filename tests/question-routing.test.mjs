import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRetrievalQuery, isWorkspaceLookup, needsProductSelection } from '../supabase/functions/ask-copeit/question-routing.js';
import { answerWorkspaceQuestion } from '../src/ask-workspace.js';

test('Ask Cope lists workspace records without mistaking workspace for CE', () => {
  const product = { id: 'p1', name: 'Aster Loop Smart Sensor', model: 'ALS-100' };
  const task = { id: 't1', title: 'Confirm the shipping configuration', status: 'open' };
  const products = answerWorkspaceQuestion('What products are in this workspace?', [product], [task]);
  assert.match(products.body, /ALS-100/);
  assert.deepEqual(products.refs, [{ type: 'product', id: 'p1', label: product.name }]);
  assert.match(answerWorkspaceQuestion('What products are in this workspace?', [], []).body, /no product profiles yet/i);
  assert.equal(answerWorkspaceQuestion('What needs attention next?', [product], [task]).refs[0]?.id, 't1');
  const regulatory = answerWorkspaceQuestion('Does this product need CE marking?', [product], []);
  assert.match(regulatory.body, /cannot give a product-specific/i);
  assert.deepEqual(regulatory.refs, []);
});

test('only explicit workspace lookups bypass official source retrieval', () => {
  assert.equal(isWorkspaceLookup('What products are in this workspace?'), true);
  assert.equal(isWorkspaceLookup('What needs attention next?'), true);
  assert.equal(isWorkspaceLookup('What products require CE marking?'), false);
});

test('product-specific export questions require a selected product', () => {
  assert.equal(needsProductSelection('What certificates does my power bank need?', null), true);
  assert.equal(needsProductSelection('What certificates does my power bank need?', 'product-id'), false);
  assert.equal(needsProductSelection('Do all products require CE marking?', null), false);
  assert.equal(needsProductSelection('Does our sensor need CE marking?', null), true);
});

test('free-form retrieval uses saved product facts without adding workspace identifiers', () => {
  const question = 'What should I verify before bringing this to Germany?';
  assert.equal(buildRetrievalQuery(question, null), question);
  const query = buildRetrievalQuery(question, {
    product: { id: 'private-id', name: 'private-name', category: 'Unscoped electronics' },
    facts: { productCategory: 'Indoor sensor', operatingVoltage: '5 V DC', radio: 'unknown', euImporter: 'private-importer' },
  });
  assert.ok(query.startsWith(question));
  assert.match(query, /Indoor sensor/);
  assert.match(query, /5 V DC/);
  assert.doesNotMatch(query, /unknown|private-/);
});
