import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkApprovedText } from '../supabase/functions/process-ingestion-jobs/worker-chunking.js';

test('worker bounds long paragraphs and preserves nested headings', () => {
  const result = chunkApprovedText(`# Directive\n## Article 1\n${'a'.repeat(6500)}`, 1000);
  assert.equal(result.length, 7);
  assert.ok(result.every(part => part.content.length <= 1000));
  assert.ok(result.every(part => part.headingPath.join(' / ') === 'Directive / Article 1'));
  assert.equal(result.map(part => part.content).join(''), 'a'.repeat(6500));
});

test('empty source produces no chunks', () => assert.deepEqual(chunkApprovedText('  \n'), []));
