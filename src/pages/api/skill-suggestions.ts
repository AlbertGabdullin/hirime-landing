import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { SKILLS_SYSTEM_PROMPT, buildSkillsPrompt } from '../../lib/skillsPrompt';

export const prerender = false;

const MAX_JD_CHARS = 4_000;
const MAX_FIELD_CHARS = 120;
const MAX_COUNT = 30; // only when focus is "All"
const MAX_BLOCK_COUNT = 10; // a single focus/block is capped at 10
const DEFAULT_COUNT = 10;

type Result = { skills: string[] };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function validateResult(raw: unknown, count: number): Result {
  if (!raw || typeof raw !== 'object') throw new Error('Model returned non-object');
  const r = raw as Record<string, unknown>;
  const arr = Array.isArray(r.skills) ? r.skills : [];
  const seen = new Set<string>();
  const skills = arr
    .map((s) => String(s ?? '').replace(/^[•\-*\s]+/, '').trim().slice(0, 80))
    .filter((s) => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
  if (skills.length === 0) throw new Error('Model returned no usable skills');
  return { skills };
}

// Clamp requested count into [1, max]; fall back to default when absent/invalid.
function parseCount(raw: unknown, max: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 1) return Math.min(DEFAULT_COUNT, max);
  return Math.min(n, max);
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY is not configured on the server' }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const profession = String(body.profession ?? '').trim().slice(0, MAX_FIELD_CHARS);
  const type = String(body.type ?? '').trim().slice(0, MAX_FIELD_CHARS);
  const level = String(body.level ?? '').trim().slice(0, MAX_FIELD_CHARS);
  const rarity = String(body.rarity ?? 'Balanced').trim().slice(0, MAX_FIELD_CHARS);
  const count = parseCount(body.count, type.toLowerCase() === 'all' ? MAX_COUNT : MAX_BLOCK_COUNT);
  const jobDescription = String(body.jobDescription ?? '').trim().slice(0, MAX_JD_CHARS);

  if (!profession) {
    return json({ error: 'A profession is required.' }, 400);
  }

  const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
  const model = (import.meta.env.OPENAI_SKILLS_MODEL as string | undefined) ?? 'gpt-5-mini';

  let parsed: Result;
  try {
    const completion = await openai.chat.completions.create({
      model,
      reasoning_effort: 'minimal',
      verbosity: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SKILLS_SYSTEM_PROMPT },
        { role: 'user', content: buildSkillsPrompt({ profession, type, level, count, rarity, jobDescription }) },
      ],
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
    const raw = completion.choices[0]?.message?.content ?? '{}';
    parsed = validateResult(JSON.parse(raw), count);
  } catch (err) {
    console.error('OpenAI error:', err);
    return json({ error: 'Generation failed — please try again in a moment' }, 502);
  }

  return json(parsed);
};
