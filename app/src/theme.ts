export const C = {
  ink: 'oklch(0.24 0.03 265)', mut: 'oklch(0.52 0.02 265)',
  acc: 'oklch(0.52 0.16 265)', accBg: 'oklch(0.96 0.025 265)', accBd: 'oklch(0.86 0.05 265)', accFg: 'oklch(0.38 0.13 265)',
  grn: 'oklch(0.6 0.14 145)', grnBg: 'oklch(0.96 0.03 145)', grnBd: 'oklch(0.88 0.06 145)', grnFg: 'oklch(0.4 0.1 145)',
  amb: 'oklch(0.74 0.15 70)', ambBg: 'oklch(0.97 0.04 70)', ambBd: 'oklch(0.89 0.07 70)', ambFg: 'oklch(0.44 0.11 70)',
  red: 'oklch(0.6 0.18 28)', redBg: 'oklch(0.96 0.03 28)', redBd: 'oklch(0.89 0.06 28)', redFg: 'oklch(0.46 0.15 28)',
  gry: 'oklch(0.7 0.02 265)', gryBg: 'oklch(0.965 0.006 265)', gryBd: 'oklch(0.92 0.01 265)', gryFg: 'oklch(0.45 0.02 265)',
};

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'flat';

const TONE_KEY: Record<Tone, 'grn' | 'amb' | 'red' | 'acc' | 'gry'> = {
  ok: 'grn', warn: 'amb', bad: 'red', info: 'acc', flat: 'gry',
};

export function tone(t: Tone) {
  const k = TONE_KEY[t] ?? 'gry';
  return { bg: C[`${k}Bg`], bd: C[`${k}Bd`], fg: C[`${k}Fg`], accent: C[k] };
}

export const SANS = "'IBM Plex Sans Thai', system-ui, sans-serif";
export const MONO = "'IBM Plex Mono', monospace";

/** Surface & line colors shared across screens */
export const L = {
  cardBd: 'oklch(0.91 0.01 265)',
  headBg: 'oklch(0.975 0.005 265)',
  headBd: 'oklch(0.93 0.01 265)',
  rowBd: 'oklch(0.95 0.008 265)',
  idle: 'oklch(0.92 0.01 265)',
  navy: 'oklch(0.22 0.04 265)',
};
