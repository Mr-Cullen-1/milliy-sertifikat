import type { QuestionType } from './format';

export type AnswerValue = string | Record<string, string> | { a?: string; b?: string };

const filled = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

/** Savolga kamida bitta javob berilganmi (navigator va topshirish oynasi uchun). */
export function isAnswered(type: QuestionType, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (type === 'y1') return filled(value);
  if (typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some(filled);
}

export type NavState = 'current' | 'flagged' | 'answered' | 'empty';

export function navState(opts: { current: boolean; flagged: boolean; answered: boolean }): NavState {
  if (opts.current) return 'current';
  if (opts.flagged) return 'flagged';
  return opts.answered ? 'answered' : 'empty';
}

/** Ochiq javob maydoniga faqat son, kasr, minus, vergul va nuqta kiritishga ruxsat beradi. */
export const sanitizeOpenInput = (s: string): string => s.replace(/[^0-9.,\-/−\s]/g, '').slice(0, 64);

/** Natija sahifasi uchun talaba javobining qisqa matni. y2ItemIds: band id lari (ko'rsatish tartibida). */
export function describeAnswer(type: QuestionType, value: unknown, y2ItemIds: string[] = [], noAnswer = 'Javob berilmagan'): string {
  if (!isAnswered(type, value)) return noAnswer;
  if (type === 'y1') return String(value).trim().toUpperCase();
  const rec = value as Record<string, string | undefined>;
  if (type === 'y2') {
    return y2ItemIds.map((id, i) => `${i + 1} → ${rec[id]?.trim().toUpperCase() || '—'}`).join(', ');
  }
  return (['a', 'b'] as const)
    .filter((k) => rec[k] !== undefined)
    .map((k) => `${k}) ${rec[k]?.trim() || '—'}`)
    .join('   ');
}

/** To'g'ri javob kalitini (question_keys.key_json) ko'rsatish matniga aylantiradi; o uchun har band birinchi shakli. */
export function describeKey(type: QuestionType, key: unknown, y2ItemIds: string[] = []): string {
  if (!key || typeof key !== 'object') return '';
  const k = key as Record<string, unknown>;
  if (type === 'y1') return typeof k.correct === 'string' ? k.correct : '';
  if (type === 'y2') {
    const pairs = (k.pairs ?? {}) as Record<string, string>;
    return y2ItemIds.map((id, i) => `${i + 1} → ${pairs[id] ?? '—'}`).join(', ');
  }
  const form = (v: unknown) => (Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined);
  return (['a', 'b'] as const)
    .map((p) => [p, form(k[p])] as const)
    .filter(([, v]) => v !== undefined)
    .map(([p, v]) => `${p}) ${v}`)
    .join('   ');
}
