import type { Lang, SlotRequest } from './types';

// --- Deterministik tasodifiylik: bir xil so'rov har doim bir xil savol beradi ---

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [a, b] (ikkala chegara kiradi) */
  int(a: number, b: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
}

function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function makeRng(seed: string): Rng {
  let a = hash(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)]!,
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance: (p) => next() < p,
  };
}

/** So'rovga xos tasodifiy oqim; salt bilan bir so'rov ichida bir nechta mustaqil oqim olish mumkin. */
export const slotRng = (req: SlotRequest, salt = ''): Rng =>
  makeRng(`${req.variant}|${req.block}|${req.type}|${req.index}|${req.position}|${salt}`);

// --- Butun sonlar va kasrlar ---

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a: number, b: number): number => Math.abs(a * b) / gcd(a, b);

export interface Frac {
  n: number;
  d: number;
}

export function frac(n: number, d = 1): Frac {
  if (d === 0) throw new Error('maxraj 0');
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

export const fAdd = (x: Frac, y: Frac): Frac => frac(x.n * y.d + y.n * x.d, x.d * y.d);
export const fSub = (x: Frac, y: Frac): Frac => frac(x.n * y.d - y.n * x.d, x.d * y.d);
export const fMul = (x: Frac, y: Frac): Frac => frac(x.n * y.n, x.d * y.d);
export const fDiv = (x: Frac, y: Frac): Frac => frac(x.n * y.d, x.d * y.n);
export const fEq = (x: Frac, y: Frac): boolean => x.n === y.n && x.d === y.d;

// --- TeX yordamchilari ---

/** 3/4 -> \frac{3}{4}, -3/4 -> -\frac{3}{4}, 5 -> 5 */
export function texFrac(f: Frac): string {
  if (f.d === 1) return String(f.n);
  return `${f.n < 0 ? '-' : ''}\\frac{${Math.abs(f.n)}}{${f.d}}`;
}

/** Manfiy sonni qavsga oladi: -3 -> (-3) */
export const texParen = (n: number): string => (n < 0 ? `(${n})` : String(n));

/** a x + b ko'rinishidagi hadni belgisi bilan: texTerm(-2,'x') = "-2x", texTerm(1,'x') = "x" */
export function texTerm(coef: number, variable: string): string {
  if (coef === 0) return '0';
  if (coef === 1) return variable;
  if (coef === -1) return `-${variable}`;
  return `${coef}${variable}`;
}

/** Katta sonlarni o'qishga qulay (bo'sh joy bilan) yozish: 149600000 -> "149\,600\,000" */
export const texBig = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');

// --- Javob kaliti (ochiq javob): qabul qilinadigan shakllar ---

/** Kasrning barcha teng shakllari: "3/4", "0.75"; butun bo'lsa "5". Cheksiz o'nli bo'lsa faqat kasr. */
export function keyForms(f: Frac): string[] {
  if (f.d === 1) return [String(f.n)];
  const forms = [`${f.n}/${f.d}`];
  let d = f.d;
  for (const p of [2, 5]) while (d % p === 0) d /= p;
  if (d === 1) {
    const dec = f.n / f.d;
    const s = String(Math.round(dec * 1e9) / 1e9);
    if (!s.includes('e')) forms.push(s);
  }
  return forms;
}

// --- Yopiq test (Y-1) variantlari ---

export type Letter = 'A' | 'B' | 'C' | 'D';

export interface Y1Built {
  options: Record<Letter, string>;
  correct: Letter;
}

/**
 * To'g'ri javob va noto'g'ri variantlardan (kamida 3 ta noyob) 4 ta variant tuzadi va aralashtiradi.
 * Variantlar matn jihatidan noyob bo'lishi shart: takrorlar tashlab yuboriladi, yetmasa xato beradi.
 */
export function y1Options(correct: string, distractors: readonly string[], rng: Rng): Y1Built {
  const seen = new Set([correct.trim()]);
  const unique: string[] = [];
  for (const d of distractors) {
    const t = d.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      unique.push(d);
    }
  }
  if (unique.length < 3) throw new Error(`kamida 3 ta noyob noto'g'ri variant kerak, ${unique.length} ta bor (to'g'ri: ${correct})`);
  const items = rng.shuffle([{ text: correct, ok: true }, ...unique.slice(0, 3).map((text) => ({ text, ok: false }))]);
  const letters: Letter[] = ['A', 'B', 'C', 'D'];
  const options = {} as Record<Letter, string>;
  let right: Letter = 'A';
  items.forEach((it, i) => {
    options[letters[i]!] = it.text;
    if (it.ok) right = letters[i]!;
  });
  return { options, correct: right };
}

/**
 * Raqamli to'g'ri javob atrofidan noyob chalg'ituvchi qiymatlar: tipik xatolar ro'yxati (xatolar) berilsa
 * avval ular, yetmasa +-delta qadamlari ishlatiladi.
 */
export function numericDistractors(correct: number, mistakes: readonly number[], rng: Rng, fmt: (n: number) => string = String): string[] {
  const out: string[] = [];
  const seen = new Set<string>([fmt(correct)]);
  const push = (n: number) => {
    const s = fmt(n);
    if (!seen.has(s) && Number.isFinite(n)) {
      seen.add(s);
      out.push(s);
    }
  };
  for (const m of mistakes) push(m);
  let step = 1;
  while (out.length < 3 && step < 50) {
    push(correct + rng.pick([-1, 1]) * step * Math.max(1, Math.round(Math.abs(correct) * 0.1) || 1));
    step++;
  }
  return out;
}

// --- Tillar ---

export type L10n = Record<Lang, string>;

/** Qisqa tarjima jadvali: tr({uz:'..',ru:'..',kaa:'..',en:'..'}, lang) */
export const tr = (t: L10n, lang: Lang): string => t[lang];
