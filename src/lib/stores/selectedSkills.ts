import { atom } from 'nanostores';

/**
 * Cross-island selection state for skills.
 *
 * Static category chips, AI-generated skill pills, and the fixed "Selected Skills"
 * tray all read/write this single store, keyed by the skill's display label — so a
 * skill's provenance (static vs AI-generated) doesn't matter. This interaction state
 * is intentionally kept OUT of the JSON content model.
 */
export const selectedSkills = atom<string[]>([]);

export function isSelected(label: string): boolean {
  return selectedSkills.get().includes(label);
}

export function toggleSkill(label: string): void {
  const cur = selectedSkills.get();
  selectedSkills.set(cur.includes(label) ? cur.filter((s) => s !== label) : [...cur, label]);
}

export function addSkill(label: string): void {
  const cur = selectedSkills.get();
  if (!cur.includes(label)) selectedSkills.set([...cur, label]);
}

export function removeSkill(label: string): void {
  selectedSkills.set(selectedSkills.get().filter((s) => s !== label));
}

export function clearSkills(): void {
  selectedSkills.set([]);
}
