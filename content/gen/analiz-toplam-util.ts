import { frac, keyForms, y1Options, type Frac, type Rng } from './helpers';
import type { Lang, Level, LocalizedContent, QuestionSpec, SlotRequest } from './types';

// "analiz" va "toplam" generatorlari uchun umumiy yordamchilar.

/** Til tanlagich: const L = langPicker(lang); L('uz matn', 'ru', 'kaa', 'en') */
export function langPicker(lang: Lang) {
  return (uz: string, ru: string, kaa: string, en: string): string => ({ uz, ru, kaa, en })[lang];
}

/** Shu variantdagi (blok, tur) slotlari bo'yicha uzluksiz tartib raqami: variant * count + index */
export const slotId = (req: SlotRequest): number => req.variant * req.count + req.index;

/** Shablonni (variant + index) bo'yicha aylantirib tanlaydi. */
export function pickTemplate<T>(req: SlotRequest, list: readonly T[]): T {
  return list[slotId(req) % list.length]!;
}

/** $...$ ichiga o'rash */
export const m = (tex: string): string => `$${tex}$`;

/** Butun sonni $...$ ichiga o'rash (numericDistractors uchun) */
export const mn = (n: number): string => `$${n}$`;

// --- Ko'phadlar ---

/** Koeffitsiyentlar yuqori darajadan: [1,-3,0,2] -> "x^{3}-3x^{2}+2" */
export function texPoly(coefs: readonly number[], v = 'x'): string {
  const deg = coefs.length - 1;
  let out = '';
  coefs.forEach((c, i) => {
    if (c === 0) return;
    const p = deg - i;
    const abs = Math.abs(c);
    const body = p === 0 ? String(abs) : `${abs === 1 ? '' : abs}${p === 1 ? v : `${v}^{${p}}`}`;
    out += `${c < 0 ? '-' : out ? '+' : ''}${body}`;
  });
  return out || '0';
}

/** y=kx+m */
export const texLine = (k: number, b: number): string => `y=${texPoly([k, b])}`;

export const polyAt = (coefs: readonly number[], x: number): number => coefs.reduce((acc, c) => acc * x + c, 0);

export function polyDer(coefs: readonly number[]): number[] {
  const deg = coefs.length - 1;
  return coefs.slice(0, -1).map((c, i) => c * (deg - i));
}

export const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

export function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

// --- Savol qurilishi ---

export interface FigureData {
  svg: string;
  alt: string;
}

export interface TextParts {
  stem_md: string;
  solution_md: string;
  mistake_note_md: string;
  figure?: FigureData;
}

export interface Y1Args {
  topic: number;
  extraTopics?: number[];
  difficulty: Level;
  estSeconds: number;
  correct: string;
  distractors: readonly string[];
  /** distractors yetmasa to'ldirish uchun zaxira variantlar */
  pad?: readonly string[];
  /** variant harflarini aralashtirish uchun (content() tashqarisida bir marta ishlatiladi) */
  rng: Rng;
  text: (lang: Lang) => TextParts;
}

export function y1Spec(a: Y1Args): QuestionSpec {
  const built = y1Options(a.correct, [...a.distractors, ...(a.pad ?? [])], a.rng);
  return {
    topic: a.topic,
    extraTopics: a.extraTopics,
    difficulty: a.difficulty,
    estSeconds: a.estSeconds,
    key: { correct: built.correct },
    content: (lang): LocalizedContent => {
      const t = a.text(lang);
      return {
        stem_md: t.stem_md,
        payload: { options: built.options, ...(t.figure ? { figure: t.figure } : {}) },
        solution_md: t.solution_md,
        mistake_note_md: t.mistake_note_md,
      };
    },
  };
}

export interface OTextParts extends TextParts {
  a?: { prompt_md: string; hint?: string };
  b?: { prompt_md: string; hint?: string };
}

export interface OArgs {
  topic: number;
  extraTopics?: number[];
  difficulty: Level;
  estSeconds: number;
  a?: Frac;
  b?: Frac;
  text: (lang: Lang) => OTextParts;
}

export function oSpec(a: OArgs): QuestionSpec {
  const key: Record<string, string[]> = {};
  if (a.a) key.a = keyForms(a.a);
  if (a.b) key.b = keyForms(a.b);
  return {
    topic: a.topic,
    extraTopics: a.extraTopics,
    difficulty: a.difficulty,
    estSeconds: a.estSeconds,
    key,
    content: (lang): LocalizedContent => {
      const t = a.text(lang);
      const parts: Record<string, { prompt_md: string; hint?: string }> = {};
      if (a.a && t.a) parts.a = t.a;
      if (a.b && t.b) parts.b = t.b;
      return {
        stem_md: t.stem_md,
        payload: { parts, ...(t.figure ? { figure: t.figure } : {}) },
        solution_md: t.solution_md,
        mistake_note_md: t.mistake_note_md,
      };
    },
  };
}

/** Butun son variantlari (0..max oralig'idan, to'g'ri javobdan tashqari); preferred avval olinadi. */
export function smallIntDistractors(correct: number, max: number, rng: Rng, preferred: readonly number[] = []): string[] {
  const pool = [...preferred, ...rng.shuffle(Array.from({ length: max + 1 }, (_, i) => i))];
  const out: string[] = [];
  for (const n of pool) {
    const s = m(String(n));
    if (n !== correct && n >= 0 && n <= max && !out.includes(s)) out.push(s);
  }
  return out;
}

/** Kasr javoblar uchun zaxira chalg'ituvchilar (asosiy tipik xatolar yetmaganda to'ldirish uchun). */
export function fracFallbacks(f: Frac): Frac[] {
  return [frac(f.n + 1, f.d), frac(f.n - 1, f.d), frac(f.n, f.d + 1), frac(f.n + f.d, f.d), frac(f.n, f.d + 2), frac(f.n * 2, f.d)];
}
