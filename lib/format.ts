import type { Lang } from './i18n/config';

/** 62.4 -> "62,4" (uz/ru/kaa) yoki "62.4" (en); 70 -> "70"; 1 xona aniqlik. */
export function formatScore(n: number, lang: Lang = 'uz'): string {
  const s = String(Math.round(n * 10) / 10);
  return lang === 'en' ? s : s.replace('.', ',');
}
