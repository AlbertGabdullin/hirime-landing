import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { extractText, getDocumentProxy } from 'unpdf';
import { ATS_SYSTEM_PROMPT, buildUserPrompt } from '../../lib/atsPrompt';

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_RESUME_CHARS = 18_000; // protect token budget

type Finding = { kind: 'ok' | 'warn' | 'bad'; text: string };
type Category = {
  key: 'formatting' | 'keywords' | 'sections' | 'length' | 'flags';
  emoji: string;
  name: string;
  score: number;
  findings: Finding[];
  tip: string;
};
type Report = { overall: number; categories: Category[] };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function validateReport(raw: unknown): Report {
  if (!raw || typeof raw !== 'object') throw new Error('Model returned non-object');
  const r = raw as Record<string, unknown>;
  const cats = Array.isArray(r.categories) ? r.categories : [];
  if (cats.length === 0) throw new Error('Model returned no categories');
  const categories: Category[] = cats.slice(0, 5).map((c) => {
    const cc = (c ?? {}) as Record<string, unknown>;
    const findingsRaw = Array.isArray(cc.findings) ? cc.findings : [];
    const findings: Finding[] = findingsRaw.slice(0, 6).map((f) => {
      const ff = (f ?? {}) as Record<string, unknown>;
      const kind = ff.kind === 'ok' || ff.kind === 'warn' || ff.kind === 'bad' ? ff.kind : 'warn';
      return { kind, text: String(ff.text ?? '').slice(0, 280) };
    });
    return {
      key: (cc.key as Category['key']) ?? 'formatting',
      emoji: String(cc.emoji ?? '•'),
      name: String(cc.name ?? 'Category'),
      score: clampInt(cc.score, 0, 100, 50),
      findings,
      tip: String(cc.tip ?? '').slice(0, 400),
    };
  });
  const overall = clampInt(
    r.overall,
    0,
    100,
    Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length),
  );
  return { overall, categories };
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY is not configured on the server' }, 500);
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return json({ error: 'Expected multipart/form-data with a "file" field' }, 400);
  }

  if (!file) return json({ error: 'No file uploaded' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'File exceeds 5MB limit' }, 413);
  const looksPdf =
    file.type === 'application/pdf' ||
    file.type === '' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!looksPdf) return json({ error: 'PDF files only' }, 415);

  let text = '';
  let pages = 0;
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const result = await extractText(pdf, { mergePages: true });
    text = (result.text ?? '').trim();
    pages = result.totalPages ?? 0;
  } catch (err) {
    console.error('unpdf error:', err);
    return json({ error: 'Could not read this PDF — try re-exporting it from your editor' }, 422);
  }

  if (!text || text.length < 40) {
    return json(
      { error: 'No selectable text found in PDF. This is likely a scan or image-only export.' },
      422,
    );
  }

  const truncated = text.length > MAX_RESUME_CHARS ? text.slice(0, MAX_RESUME_CHARS) : text;
  const words = truncated.split(/\s+/).filter(Boolean).length;

  const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
  const model = (import.meta.env.OPENAI_MODEL as string | undefined) ?? 'gpt-4o-mini';

  let parsed: Report;
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ATS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt({
            text: truncated,
            pages: pages || 1,
            words,
            chars: truncated.length,
            filename: file.name,
          }),
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    parsed = validateReport(JSON.parse(raw));
  } catch (err) {
    console.error('OpenAI error:', err);
    return json({ error: 'Analysis failed — please try again in a moment' }, 502);
  }

  return json({
    filename: file.name,
    pages,
    words,
    ...parsed,
  });
};
