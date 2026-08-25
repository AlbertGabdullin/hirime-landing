import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Resume Skills — one JSON file per profession page.
 *
 * The filename is the slug (e.g. `frontend-developer.json` → /resume-skills/frontend-developer),
 * so `slug` is NOT stored inside the file. Content is validated at build time: a malformed
 * file fails `astro build` with a field-level error.
 *
 * Inline text conventions (rendered by src/lib/richText.ts, never raw HTML in JSON):
 *   *text*    → Instrument-Serif emphasis (.serif-em)
 *   ==text==  → accent highlight (<mark>)
 */

// Seniority tier at which a skill first becomes expected. A plain-string skill
// (or an object without `tier`) defaults to "junior" — i.e. a foundational skill
// present at every level. Level pages inherit the hub's skills and filter by tier.
const Level = z.enum(['junior', 'mid', 'senior']);

// A skill is a plain string by default; use the object form only where a stable
// id, a tier, or a note earns its keep (dedup, level filtering, analytics).
const Skill = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    label: z.string(),
    note: z.string().optional(),
    tier: Level.optional(),
  }),
]);

const Cta = z.object({ label: z.string(), href: z.string() });

const resumeSkills = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/resume-skills' }),
  schema: z.object({
    status: z.enum(['draft', 'published']).default('published'),

    profession: z.object({
      name: z.string(),
      shortName: z.string().optional(),

      // ── Taxonomy (all optional; drives index grouping + level pages) ──
      category: z.string().optional(),   // index block, e.g. "Software Engineering"
      family: z.string().optional(),     // groups level variants, slug e.g. "frontend-developer"
      familyName: z.string().optional(), // display base name, e.g. "Frontend Developer"
      level: Level.optional(),           // absent = hub / all-levels page
      order: z.number().optional(),      // sort within a category
    }),

    // All optional → derived defaults in [slug].astro when omitted.
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        ogTitle: z.string().optional(),
        ogDescription: z.string().optional(),
        keywords: z.string().optional(),
      })
      .default({}),

    hero: z.object({
      title: z.string(), // may contain *serif* emphasis
      lede: z.string(),
      featuredSkills: z.array(z.string()).min(1),
      primaryCta: Cta.optional(),
      secondaryCta: Cta.optional(),
    }),

    quickAnswer: z.object({
      question: z.string(),
      answer: z.string(),
      essentials: z.array(z.string()).min(1),
    }),

    // Optional: a level page (profession.level set) inherits categories from its
    // family hub when omitted. Hub pages and standalone pages define their own.
    categories: z
      .array(
        z.object({
          id: z.string(), // section anchor + copy-all scope, e.g. "technical"
          title: z.string(),
          lead: z.string().optional(),
          countLabel: z.string().optional(), // override, e.g. "choose 3–5"; else derived
          layout: z.enum(['chips', 'list', 'columns']).default('chips'),
          skills: z.array(Skill).min(1),
        }),
      )
      .min(1)
      .optional(),

    // Profession-specific CONFIG only — the component/endpoint own all logic.
    generator: z
      .object({
        defaultType: z.string().default('Technical'),
        types: z
          .array(z.string())
          .default(['Technical', 'Frameworks', 'Tools', 'Soft Skills', 'Leadership', 'All']),
        levels: z.array(z.string()).default(['Entry Level', 'Mid Level', 'Senior']),
        defaultLevel: z.string().default('Mid Level'),
        // How many skills to generate. A single focus/block is capped at 10; only "All"
        // unlocks the larger sets (server enforces the same rule). Rarity: how common/rare.
        counts: z.array(z.number().int().positive().max(30)).default([10, 15, 20, 25, 30]),
        blockCounts: z.array(z.number().int().positive().max(10)).default([5, 8, 10]),
        defaultCount: z.number().int().positive().max(30).default(10),
        rarities: z.array(z.string()).default(['Common', 'Balanced', 'Niche']),
        defaultRarity: z.string().default('Balanced'),
      })
      .default({}),

    experienceLevels: z
      .array(
        z.object({
          name: z.string(),
          subtitle: z.string(),
          filled: z.number().int().min(1).max(3),
          skills: z.array(z.string()),
        }),
      )
      .optional(),

    placements: z
      .array(
        z.object({
          title: z.string(),
          kind: z.enum(['skills', 'summary', 'bullet']),
          roleLabel: z.string(),
          skills: z.array(z.string()).optional(), // kind: skills
          text: z.string().optional(), // kind: summary | bullet (supports ==highlight==)
          note: z.string(),
        }),
      )
      .optional(),

    comparisons: z.array(z.object({ basic: z.string(), better: z.string() })).optional(),

    jobDescriptionExample: z
      .object({
        excerpt: z.string(), // supports ==highlight==
        prioritizedSkills: z.array(z.string()),
      })
      .optional(),

    mistakes: z.array(z.object({ title: z.string(), detail: z.string() })).optional(),

    skillsToAvoid: z
      .object({
        heading: z.string().optional(),
        description: z.string().optional(),
        skills: z.array(z.string()),
      })
      .optional(),

    related: z.array(z.string()).optional(), // slugs of other resume-skills pages

    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
});

export const collections = { resumeSkills };
