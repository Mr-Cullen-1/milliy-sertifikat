import type { LevelSpec } from './format';

/** Taxminiy shkala balidan daraja kodi; chegaradan past bo'lsa null (daraja berilmaydi). */
export function levelFor(scaled: number, levels: LevelSpec[]): string | null {
  for (const level of levels) {
    if (scaled >= level.min) return level.code;
  }
  return null;
}
