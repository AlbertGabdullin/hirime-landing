import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { Check, Plus } from 'lucide-react';

import { selectedSkills, toggleSkill } from '@/lib/stores/selectedSkills';

type Tier = 'junior' | 'mid' | 'senior';

type SkillInput = string | { id?: string; label: string; note?: string; tier?: Tier };

export type CategoryData = {
  id: string;
  title: string;
  lead?: string;
  countLabel?: string;
  layout?: 'chips' | 'list' | 'columns';
  skills: SkillInput[];
};

const TIER_RANK: Record<Tier, number> = { junior: 0, mid: 1, senior: 2 };
const TIERS: Tier[] = ['junior', 'mid', 'senior'];
const TIER_LABEL: Record<Tier, string> = { junior: 'Junior', mid: 'Middle', senior: 'Senior' };

// The in-page filter adds an explicit "All levels" on top of the three tiers.
type Filter = 'all' | Tier;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All levels' },
  { key: 'junior', label: 'Junior' },
  { key: 'mid', label: 'Middle' },
  { key: 'senior', label: 'Senior' },
];

const showsSkill = (skillTier: Tier, active: Filter) =>
  active === 'all' || TIER_RANK[skillTier] <= TIER_RANK[active];

const label = (s: SkillInput) => (typeof s === 'string' ? s : s.label);
const tierOf = (s: SkillInput): Tier => (typeof s === 'string' ? 'junior' : s.tier ?? 'junior');

function Chip({
  name,
  tier,
  tiered,
  selected,
  visible,
}: {
  name: string;
  tier: Tier;
  tiered: boolean;
  selected: boolean;
  visible: boolean;
}) {
  return (
    <button
      type="button"
      className={`chip${selected ? ' on' : ''}${tiered ? ` tier-${tier}` : ''}`}
      onClick={() => toggleSkill(name)}
      aria-pressed={selected}
      hidden={!visible}
      title={tiered ? `Expected from ${TIER_LABEL[tier]} level` : undefined}
    >
      {tiered && <span className="chip-tier" aria-hidden="true" />}
      <span className="chip-txt">{name}</span>
      <span className="chip-add" aria-hidden="true">
        {selected ? <Check size={13} /> : <Plus size={13} />}
      </span>
    </button>
  );
}

function Category({ cat, active, tiered }: { cat: CategoryData; active: Filter; tiered: boolean }) {
  const selected = useStore(selectedSkills);
  const [copied, setCopied] = useState(false);

  const visibleSkills = cat.skills.filter((s) => !tiered || showsSkill(tierOf(s), active));
  const names = visibleSkills.map(label);
  const count = cat.countLabel && !tiered ? cat.countLabel : `${names.length} skills`;

  // Nothing at this level in this category → drop the whole block.
  if (visibleSkills.length === 0) return null;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(names.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="cat-block" id={`c-${cat.id}`}>
      <div className="cat-label">
        <h3>{cat.title}</h3>
        <div className="cat-tools">
          <span className="count">{count}</span>
          <button type="button" className={`copy-all-cat${copied ? ' copied' : ''}`} onClick={copyAll}>
            {copied ? 'Copied' : 'Copy all'}
          </button>
        </div>
        {cat.lead && <p className="lead">{cat.lead}</p>}
      </div>
      <div className="skill-chips">
        {cat.skills.map((s) => {
          const name = label(s);
          const tier = tierOf(s);
          return (
            <Chip
              key={name}
              name={name}
              tier={tier}
              tiered={tiered}
              selected={selected.includes(name)}
              visible={!tiered || showsSkill(tier, active)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function SkillCategories({
  categories,
  tiered = false,
  defaultTier = null,
}: {
  categories: CategoryData[];
  tiered?: boolean;
  defaultTier?: Tier | null;
}) {
  // Hub pages start at "All levels"; level pages start at their own tier.
  const [active, setActive] = useState<Filter>(defaultTier ?? 'all');

  return (
    <>
      {tiered && (
        <div className="tier-controls">
          <div className="tier-toggle">
            <span className="tier-toggle-label">Show skills for</span>
            <div className="seg tier-seg" role="tablist" aria-label="Experience level">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  className={`tone-${key}`}
                  aria-selected={active === key}
                  data-state={active === key ? 'on' : 'off'}
                  onClick={() => setActive(key)}
                >
                  <span className="seg-dot" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="tier-legend" aria-hidden="true">
            {TIERS.map((tier) => (
              <span key={tier} className={`tier-legend-item tier-${tier}`}>
                <span className="chip-tier" />
                {TIER_LABEL[tier]}
              </span>
            ))}
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <Category key={cat.id} cat={cat} active={active} tiered={tiered} />
      ))}
    </>
  );
}
