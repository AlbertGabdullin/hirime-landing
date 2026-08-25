/**
 * Minimal, deterministic inline formatting for JSON content — no raw HTML in the
 * content files. Two conventions:
 *   *text*   → serif emphasis  (kind: "serif", render as <span class="serif-em">)
 *   ==text== → accent highlight (kind: "mark",  render as <mark>)
 *
 * Returns an ordered list of segments so both Astro and React can render safely
 * without dangerouslySetInnerHTML / set:html.
 */
export type RichSegment = { text: string; kind: 'plain' | 'serif' | 'mark' };

const TOKEN = /(==[^=]+==|\*[^*]+\*)/g;

export function parseRichText(input: string): RichSegment[] {
  if (!input) return [];
  const out: RichSegment[] = [];
  let last = 0;
  for (const m of input.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: input.slice(last, idx), kind: 'plain' });
    const tok = m[0];
    if (tok.startsWith('==')) out.push({ text: tok.slice(2, -2), kind: 'mark' });
    else out.push({ text: tok.slice(1, -1), kind: 'serif' });
    last = idx + tok.length;
  }
  if (last < input.length) out.push({ text: input.slice(last), kind: 'plain' });
  return out;
}
