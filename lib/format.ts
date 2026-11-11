import type { Lang } from './i18n/config';

/** DTM ballari uchun: 2 xonagacha aniqlik, ortiqcha nollarsiz (85.846 -> "85,85"; 93 -> "93"). Ikki marta yaxlitlash (2 xona, keyin 1 xona) xatosini oldini oladi. */
export function formatPoints(n: number, lang: Lang = 'uz'): string {
  const s = String(Math.round(n * 100) / 100);
  return lang === 'en' ? s : s.replace('.', ',');
}

/** 62.4 -> "62,4" (uz/ru/kaa) yoki "62.4" (en); 70 -> "70"; 1 xona aniqlik. */
export function formatScore(n: number, lang: Lang = 'uz'): string {
  const s = String(Math.round(n * 10) / 10);
  return lang === 'en' ? s : s.replace('.', ',');
}
