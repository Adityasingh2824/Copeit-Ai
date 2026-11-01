/** Split approved staging text into bounded, overlapping chunks. */
export function chunkText(input, { maxChars = 1800, overlap = 180 } = {}) {
  if (typeof input !== 'string') throw new TypeError('Document content must be text');
  if (!Number.isInteger(maxChars) || maxChars < 64 || !Number.isInteger(overlap) || overlap < 0 || overlap >= maxChars) {
    throw new RangeError('Invalid chunk size or overlap');
  }
  const text = input.replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end);
      const space = text.lastIndexOf(' ', end);
      const preferred = Math.max(boundary, space);
      if (preferred > start + Math.floor(maxChars / 2)) end = preferred;
    }
    const content = text.slice(start, end).trim();
    if (content) chunks.push({ ordinal: chunks.length, content });
    if (end === text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
