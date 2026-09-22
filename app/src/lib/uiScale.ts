/** Whole-page text/UI size, applied as CSS zoom through the --ui-scale variable (see index.css). */
export const UI_SCALES = [
  { value: 1, label: 'ปกติ' },
  { value: 1.15, label: 'ใหญ่' },
  { value: 1.3, label: 'ใหญ่มาก' },
];

const STORAGE_KEY = 'ui-scale';
const DEFAULT_SCALE = 1.15;

export function getUiScale(): number {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return UI_SCALES.some((s) => s.value === saved) ? saved : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

export function applyUiScale(scale: number, remember = false) {
  document.documentElement.style.setProperty('--ui-scale', String(scale));
  if (!remember) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(scale));
  } catch {
    // Storage can be unavailable (private mode); the size still applies for this visit.
  }
}
