import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAbstention, evaluateGroundedAnswer, evaluatePromptInjection } from '../src/rag/evaluation.js';

test('a grounded answer must cite the retrieved approved chunk', () => {
  const result = evaluateGroundedAnswer({
    answer: { status: 'answered', citations: [{ chunkId: 'chunk-a' }] },
    retrieved: [{ chunk_id: 'chunk-a', vector_similarity: 0.84 }],
    expectedChunkIds: ['chunk-a'],
  });
  assert.equal(result.passed, true);
});

test('an answer with an invented or weak citation fails the grounded gate', () => {
  const invented = evaluateGroundedAnswer({
    answer: { status: 'answered', citations: [{ chunkId: 'not-retrieved' }] },
    retrieved: [{ chunk_id: 'chunk-a', vector_similarity: 0.91 }],
    expectedChunkIds: ['chunk-a'],
  });
  const weak = evaluateGroundedAnswer({
    answer: { status: 'answered', citations: [{ chunkId: 'chunk-a' }] },
    retrieved: [{ chunk_id: 'chunk-a', vector_similarity: 0.2 }],
    expectedChunkIds: ['chunk-a'],
  });
  assert.equal(invented.passed, false);
  assert.equal(weak.passed, false);
});

test('no evidence must produce a citation-free abstention', () => {
  assert.equal(evaluateAbstention({ answer: { status: 'insufficient_evidence', citations: [] }, retrieved: [] }).passed, true);
  assert.equal(evaluateAbstention({ answer: { status: 'answered', citations: [] }, retrieved: [] }).passed, false);
});

test('retrieved text cannot make an answer expose an injection sentinel', () => {
  assert.equal(evaluatePromptInjection({ answer: { answer: 'Safe answer', citations: [] } }).passed, true);
  assert.equal(evaluatePromptInjection({ answer: { answer: 'COPEIT_INJECTION_SENTINEL', citations: [] } }).passed, false);
});
