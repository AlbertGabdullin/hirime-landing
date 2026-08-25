import { useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Check, RotateCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { selectedSkills, toggleSkill } from '@/lib/stores/selectedSkills';

type GeneratorConfig = {
  defaultType: string;
  types: string[];
  levels: string[];
  defaultLevel: string;
  counts: number[];
  blockCounts: number[];
  defaultCount: number;
  rarities: string[];
  defaultRarity: string;
};

type Status = 'idle' | 'loading' | 'done';

// Nearest available option to a desired value (used when switching focus clamps the count).
const nearest = (n: number, opts: number[]) =>
  opts.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a), opts[0]);

// Offline / failure fallback so the section always demonstrates value.
const FALLBACK: Record<string, string[]> = {
  Technical: ['JavaScript (ES6+)', 'TypeScript', 'HTML5', 'CSS3', 'REST APIs', 'GraphQL', 'Responsive Design', 'Web Accessibility', 'Browser APIs', 'Async Programming'],
  Frameworks: ['React', 'Next.js', 'Redux Toolkit', 'TanStack Query', 'Vue 3', 'Tailwind CSS', 'React Router', 'Zustand'],
  Tools: ['Git', 'GitHub Actions', 'Vite', 'Webpack', 'pnpm', 'Chrome DevTools', 'Storybook', 'Figma'],
  'Soft Skills': ['Cross-functional Communication', 'Code Review', 'Problem Solving', 'Ownership', 'Attention to Detail', 'Mentoring'],
  Leadership: ['Frontend Architecture', 'Technical Leadership', 'System Design', 'Mentoring', 'Roadmap Planning', 'Cross-team Collaboration'],
  All: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Testing (Jest/Playwright)', 'REST APIs', 'Performance Optimization', 'Git', 'Responsive Design', 'Accessibility (WCAG)', 'Redux', 'Tailwind CSS'],
};

export default function SkillGenerator({
  profession,
  config,
}: {
  profession: string;
  config: GeneratorConfig;
}) {
  const [type, setType] = useState(config.defaultType);
  const [level, setLevel] = useState(config.defaultLevel);
  const [count, setCount] = useState(config.defaultCount);
  const [rarity, setRarity] = useState(config.defaultRarity);
  const [jd, setJd] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [skills, setSkills] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const selected = useStore(selectedSkills);
  const resRef = useRef<HTMLDivElement>(null);

  // Only "All" unlocks the larger counts; a single focus is capped at 10.
  const countOptions = type === 'All' ? config.counts : config.blockCounts;

  const changeType = (v: string) => {
    setType(v);
    const opts = v === 'All' ? config.counts : config.blockCounts;
    if (!opts.includes(count)) setCount(nearest(count, opts));
  };

  const selectedHere = skills.filter((s) => selected.includes(s));

  const generate = async () => {
    setStatus('loading');
    setSkills([]);
    setNote('');
    let result: string[] | null = null;
    try {
      const res = await fetch('/api/skill-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profession, type, level, count, rarity, jobDescription: jd.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !Array.isArray(data.skills) || !data.skills.length) {
        throw new Error((data && data.error) || 'Generation failed');
      }
      result = (data.skills as string[]).slice(0, count);
    } catch {
      result = (FALLBACK[type] ?? FALLBACK.All).slice(0, count);
      setNote('Showing a sample set — live AI generation is unavailable right now.');
    }
    setSkills(result);
    setStatus('done');
    setTimeout(() => resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
  };

  const copy = async () => {
    const text = (selectedHere.length ? selectedHere : skills).join(', ');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(selectedHere.length ? `Copied ${selectedHere.length} skills` : 'Copied all skills');
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="gen-wrap">
      <div className="gen-controls">
        <div>
          <div className="ctl-label">Skill type</div>
          <ToggleGroup
            type="single"
            className="seg"
            value={type}
            onValueChange={(v) => v && changeType(v)}
          >
            {config.types.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div>
          <div className="ctl-label">Experience level</div>
          <ToggleGroup
            type="single"
            className="seg"
            value={level}
            onValueChange={(v) => v && setLevel(v)}
          >
            {config.levels.map((l) => (
              <ToggleGroupItem key={l} value={l}>
                {l}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div>
          <div className="ctl-label">
            How many skills{' '}
            {type !== 'All' && (
              <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· up to 10 per focus</span>
            )}
          </div>
          <ToggleGroup
            type="single"
            className="seg"
            value={String(count)}
            onValueChange={(v) => v && setCount(Number(v))}
          >
            {countOptions.map((c) => (
              <ToggleGroupItem key={c} value={String(c)}>
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div>
          <div className="ctl-label">
            Rarity{' '}
            <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· common ↔ niche</span>
          </div>
          <ToggleGroup
            type="single"
            className="seg"
            value={rarity}
            onValueChange={(v) => v && setRarity(v)}
          >
            {config.rarities.map((r) => (
              <ToggleGroupItem key={r} value={r}>
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="jd-field">
        <div className="ctl-label">
          Job description{' '}
          <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· optional, improves relevance</span>
        </div>
        <Textarea
          placeholder="Paste a job posting here to prioritize the skills it asks for…"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
      </div>

      <div className="gen-foot">
        <span className="gen-hint">{count} {rarity.toLowerCase()} skills · tailored to type + level</span>
        <Button size="lg" onClick={generate} disabled={status === 'loading'} style={{ padding: '16px', display: 'flex' }} >
          {status === 'loading' ? (
            'Generating…'
          ) : (
            <>
              Generate Skills <Sparkles size={15} />
            </>
          )}
        </Button>
      </div>

      {status !== 'idle' && (
        <div className="gen-results" ref={resRef}>
          {status === 'loading' && (
            <div className="gen-loading">
              <span className="spin" /> Generating {type.toLowerCase()} skills for {level.toLowerCase()}…
            </div>
          )}
          {status === 'done' && (
            <>
              <div className="rh">
                <div className="t">
                  {type} skills · {level}{' '}
                  <span>
                    — tap to select{selectedHere.length ? ` (${selectedHere.length} selected)` : ''}
                  </span>
                </div>
              </div>
              <div className="sel-grid">
                {skills.map((s, i) => {
                  const on = selected.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`sel-pill${on ? ' on' : ''}`}
                      style={{ animationDelay: `${i * 0.03}s` }}
                      onClick={() => toggleSkill(s)}
                    >
                      <span className="chk">{on && <Check size={9} strokeWidth={3.5} />}</span>
                      {s}
                    </button>
                  );
                })}
              </div>
              {note && <div className="gen-note">{note}</div>}
              <div className="gen-actions">
                <Button onClick={copy}>
                  {selectedHere.length ? `Copy ${selectedHere.length} skills` : 'Copy all'}
                </Button>
                <Button variant="outline" onClick={generate}>
                  <RotateCw size={14} /> Regenerate
                </Button>
              </div>
              <div className="gen-cta-sub">
                <a href="#build">Use these skills in Hirime Resume Builder →</a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
