// Split approved source text into bounded passages without losing headings.
export function chunkApprovedText(text, maxChars = 2800) {
  if (typeof text !== 'string' || !Number.isInteger(maxChars) || maxChars < 64) throw new TypeError('Invalid source or chunk size');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const chunks = [];
  let headings = [];
  let current = '';
  const flush = () => { if (current.trim()) chunks.push({ content: current.trim(), headingPath: [...headings] }); current = ''; };
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.{1,240})\s*$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      headings = headings.slice(0, level - 1);
      headings[level - 1] = heading[2].trim();
      headings = headings.filter(Boolean);
      continue;
    }
    let rest = line;
    while (rest.length) {
      const room = maxChars - current.length - (current ? 1 : 0);
      if (room <= 0) { flush(); continue; }
      const take = Math.min(room, rest.length);
      current += `${current ? '\n' : ''}${rest.slice(0, take)}`;
      rest = rest.slice(take);
      if (rest.length) flush();
    }
  }
  flush();
  return chunks;
}
