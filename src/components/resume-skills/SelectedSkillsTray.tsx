import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { Check, ChevronUp, Copy, X } from 'lucide-react';
import { toast } from 'sonner';

import { selectedSkills, clearSkills, removeSkill } from '@/lib/stores/selectedSkills';

/**
 * Fixed "Selected Skills" tray. Reads the shared cross-island store; skills added
 * from static category chips and from AI-generated pills both land here.
 */
export default function SelectedSkillsTray() {
  const skills = useStore(selectedSkills);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const count = skills.length;
  const preview = skills.slice(0, 3).join(' · ');
  const extra = count - 3;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(skills.join(', '));
      setCopied(true);
      toast.success(`Copied ${count} skill${count === 1 ? '' : 's'}`);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={`rs-sel-bar${count > 0 ? ' show' : ''}${open ? ' open' : ''}`}>
      <div className="sb-main">
        <button
          type="button"
          className="sb-summary"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sb-title">
            <span>{count}</span> Selected Skills <ChevronUp className="chev" size={13} />
          </span>
          <span className="sb-preview">
            {preview}
            {extra > 0 && <span className="more"> · +{extra} more</span>}
          </span>
        </button>
        <div className="sb-actions">
          <button
            type="button"
            className={`sb-btn${copied ? ' copied' : ''}`}
            onClick={copyAll}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} Copy
          </button>
          <button type="button" className="sb-btn" onClick={clearSkills}>
            Clear
          </button>
        </div>
      </div>
      <div className="sb-drawer">
        <div className="sb-drawer-inner">
          <div className="dh">Selected Skills</div>
          <div className="sb-list">
            {skills.map((name) => (
              <span className="sb-tag" key={name}>
                <span>{name}</span>
                <button
                  type="button"
                  className="rm"
                  aria-label={`Remove ${name}`}
                  onClick={() => removeSkill(name)}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
