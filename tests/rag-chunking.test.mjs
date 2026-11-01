import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../src/rag/chunking.js';

test('chunks long documents within bounds and preserves overlap', () => {
  const text = Array.from({ length: 150 }, (_, i) => `section${i}`).join(' ');
  const chunks = chunkText(text, { maxChars: 100, overlap: 20 });
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk, i) => chunk.ordinal === i && chunk.content.length <= 100));
  assert.ok(chunks[0].content.includes('section0'));
  assert.ok(chunks.at(-1).content.includes('section149'));
  assert.ok(chunks[0].content.split(' ').some(word => chunks[1].content.includes(word) && word.length > 3));
});

test('rejects invalid parameters and ignores empty documents', () => {
  assert.deepEqual(chunkText('  \r\n '), []);
  assert.throws(() => chunkText('text', { maxChars: 64, overlap: 64 }), RangeError);
  assert.throws(() => chunkText(null), TypeError);
});
