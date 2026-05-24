import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

const ATS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume auditor. You evaluate resume text the way modern parsers (Workday, Greenhouse, Lever, Taleo, iCIMS, SmartRecruiters, BambooHR, Ashby) actually read it, and you grade it for hiring readiness.

You receive ONLY the plain-text extraction of a candidate's resume PDF (and, optionally, the raw count of pages / characters / words / a flag if extraction looked degraded). You do not see the visual layout, so:
- Treat tables, multi-column layouts, image-only logos, and graphical elements as DETECTABLE only when their textual signature is obvious (e.g. headers running together, columns interleaving, empty/garbled sections, missing whitespace between unrelated words, encoded characters).
- If extraction looks clean and structured, assume layout is largely safe and grade on what the text shows.

Score the resume across five categories. Each score is an INTEGER 0–100. Be honest and discriminating — do not default to 70s. Use the full range.

Categories (use these keys exactly):

1. formatting (📄 Formatting)
   Parseability cues: section ordering, consistent date formatting, font/encoding artefacts visible in text (Â, â€™, mojibake, missing spaces, run-together lines), table or column artefacts, presence of standard ASCII bullets vs decorative symbols.

2. keywords (🔑 Keywords)
   Action verb strength (Led, Built, Shipped, Designed, Reduced, Owned, Launched…), variety, weak openers ("Responsible for", "Worked on", "Helped"), industry terminology density, and presence of role-relevant hard skills / tools.

3. sections (📋 Sections)
   Presence and naming of standard ATS-recognised sections: Contact, Summary/Objective, Experience/Work Experience, Education, Skills, plus optional Certifications/Projects. Flag non-standard names ("My Journey", "What I Do") that ATS parsers miss.

4. length (📏 Length & Density)
   Word count vs apparent seniority, bullet length (ideal 12–20 words), % of bullets containing quantified results (numbers, %, $, time), pages vs experience depth.

5. flags (🚫 Red Flags)
   Encoding issues, suspected embedded image (e.g. missing expected name/contact text), header/footer-only contact info, dense walls of text, suspicious whitespace patterns, links rendered as raw garbage, non-standard characters.

OUTPUT FORMAT — return ONLY a JSON object matching this exact schema (no markdown, no prose):

{
  "overall": <integer 0-100, weighted average of category scores rounded to int>,
  "categories": [
    {
      "key": "formatting" | "keywords" | "sections" | "length" | "flags",
      "emoji": "📄" | "🔑" | "📋" | "📏" | "🚫",
      "name": "Formatting" | "Keywords" | "Sections" | "Length & Density" | "Red Flags",
      "score": <integer 0-100>,
      "findings": [
        { "kind": "ok" | "warn" | "bad", "text": "<one specific concrete observation, ≤140 chars, reference exact evidence from the resume when possible>" }
      ],
      "tip": "<one actionable fix sentence, ≤200 chars, references a specific issue from the findings>"
    }
  ]
}

Rules:
- Return EXACTLY 5 categories in the order above (formatting, keywords, sections, length, flags).
- Each category MUST have 3 findings — a mix of kinds reflecting reality (don't always return 3 "ok").
- Findings must be SPECIFIC and reference actual content ("Detected 34 action verbs including Led, Built, Reduced" — not "Good verbs"). Cite counts, examples, sample bullets.
- If the text is so sparse it's clearly an image-only PDF, give very low scores and flag it.
- Never invent content not present in the resume.
- "overall" should reflect the worst categories more than the best — a single critical red flag should pull it down.
- Respond with raw JSON only. No code fences. No commentary.`;
function buildUserPrompt(args) {
  const { text, pages, words, chars, filename } = args;
  const degraded = words < 80 || chars < 400 ? "\nWARNING: Extraction looks sparse — likely an image-based or heavily-formatted PDF." : "";
  return `Audit the resume below.

Filename: ${filename ?? "unknown.pdf"}
Pages: ${pages}
Characters: ${chars}
Words: ${words}${degraded}

--- RESUME TEXT START ---
${text}
--- RESUME TEXT END ---

Return the JSON report now.`;
}

const prerender = false;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_CHARS = 18e3;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json" }
});
function clampInt(n, min, max, fallback) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}
function validateReport(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Model returned non-object");
  const r = raw;
  const cats = Array.isArray(r.categories) ? r.categories : [];
  if (cats.length === 0) throw new Error("Model returned no categories");
  const categories = cats.slice(0, 5).map((c) => {
    const cc = c ?? {};
    const findingsRaw = Array.isArray(cc.findings) ? cc.findings : [];
    const findings = findingsRaw.slice(0, 6).map((f) => {
      const ff = f ?? {};
      const kind = ff.kind === "ok" || ff.kind === "warn" || ff.kind === "bad" ? ff.kind : "warn";
      return { kind, text: String(ff.text ?? "").slice(0, 280) };
    });
    return {
      key: cc.key ?? "formatting",
      emoji: String(cc.emoji ?? "•"),
      name: String(cc.name ?? "Category"),
      score: clampInt(cc.score, 0, 100, 50),
      findings,
      tip: String(cc.tip ?? "").slice(0, 400)
    };
  });
  const overall = clampInt(
    r.overall,
    0,
    100,
    Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length)
  );
  return { overall, categories };
}
const POST = async ({ request }) => {
  let file = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return json({ error: 'Expected multipart/form-data with a "file" field' }, 400);
  }
  if (!file) return json({ error: "No file uploaded" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "File exceeds 5MB limit" }, 413);
  const looksPdf = file.type === "application/pdf" || file.type === "" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksPdf) return json({ error: "PDF files only" }, 415);
  let text = "";
  let pages = 0;
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    text = (result.text ?? "").trim();
    pages = result.total ?? result.pages?.length ?? 0;
  } catch (err) {
    console.error("pdf-parse error:", err);
    return json({ error: "Could not read this PDF — try re-exporting it from your editor" }, 422);
  }
  if (!text || text.length < 40) {
    return json(
      { error: "No selectable text found in PDF. This is likely a scan or image-only export." },
      422
    );
  }
  const truncated = text.length > MAX_RESUME_CHARS ? text.slice(0, MAX_RESUME_CHARS) : text;
  const words = truncated.split(/\s+/).filter(Boolean).length;
  const openai = new OpenAI({ apiKey: "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" });
  const model = "gpt-4o-mini";
  let parsed;
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ATS_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt({
            text: truncated,
            pages: pages || 1,
            words,
            chars: truncated.length,
            filename: file.name
          })
        }
      ]
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    parsed = validateReport(JSON.parse(raw));
  } catch (err) {
    console.error("OpenAI error:", err);
    return json({ error: "Analysis failed — please try again in a moment" }, 502);
  }
  return json({
    filename: file.name,
    pages,
    words,
    ...parsed
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
