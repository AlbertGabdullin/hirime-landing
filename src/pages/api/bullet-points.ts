import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { BULLET_STYLES, BULLET_SYSTEM_PROMPT, buildBulletPrompt } from '../../lib/bulletPrompt';

export const prerender = false;

const MAX_DESC_CHARS = 2_000;
const MAX_FIELD_CHARS = 120;

type Variant = { key: string; style: string; bullets: string[] };
type Result = { variants: Variant[] };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function validateResult(raw: unknown): Result {
  if (!raw || typeof raw !== 'object') throw new Error('Model returned non-object');
  const r = raw as Record<string, unknown>;
  const vs = Array.isArray(r.variants) ? r.variants : [];
  if (vs.length === 0) throw new Error('Model returned no variants');

  const variants: Variant[] = vs.slice(0, 5).map((v, i) => {
    const vv = (v ?? {}) as Record<string, unknown>;
    const meta = BULLET_STYLES[i];
    const bulletsRaw = Array.isArray(vv.bullets) ? vv.bullets : [];
    const bullets = bulletsRaw
      .slice(0, 4)
      .map((b) => String(b ?? '').replace(/^[•\-*\s]+/, '').trim().slice(0, 300))
      .filter(Boolean);
    return {
      key: String(vv.key ?? meta?.key ?? `style-${i}`),
      style: String(vv.style ?? meta?.style ?? 'Style'),
      bullets: bullets.length ? bullets : [],
    };
  }).filter((v) => v.bullets.length > 0);

  if (variants.length === 0) throw new Error('Model returned no usable bullets');
  return { variants };
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

  const description = String(body.description ?? '').trim().slice(0, MAX_DESC_CHARS);
  const role = String(body.role ?? '').trim().slice(0, MAX_FIELD_CHARS);
  const level = String(body.level ?? '').trim().slice(0, MAX_FIELD_CHARS);

  if (description.length < 10) {
    return json({ error: 'Please describe what you do in a bit more detail.' }, 400);
  }

  const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
  const model = (import.meta.env.OPENAI_BULLET_MODEL as string | undefined) ?? 'gpt-5-mini';

  let parsed: Result;
  try {
    const completion = await openai.chat.completions.create({
      model,
      // gpt-5 reasoning controls: minimal thinking + terse output keep this
      // structured-JSON task fast without hurting quality.
      reasoning_effort: 'minimal',
      verbosity: 'medium',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: BULLET_SYSTEM_PROMPT },
        { role: 'user', content: buildBulletPrompt({ role, level, description }) },
      ],
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
    const raw = completion.choices[0]?.message?.content ?? '{}';
    parsed = validateResult(JSON.parse(raw));
  } catch (err) {
    console.error('OpenAI error:', err);
    return json({ error: 'Generation failed — please try again in a moment' }, 502);
  }

  return json(parsed);
};