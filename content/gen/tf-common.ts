import { fAdd, fSub, frac, keyForms, makeRng, slotRng, texFrac, y1Options, type Frac, type L10n, type Rng } from './helpers';
import type { Lang, QuestionSpec, SlotRequest } from './types';

// "tenglama" va "funksiyalar" bloklari uchun umumiy yordamchilar: shablon tuzilmasi, glossary, formatlash.

export const M = (s: string): string => `$${s}$`;
export const pick = (t: L10n) => (l: Lang): string => t[l];

// --- Glossary: atamalar bir joyda (izchillik uchun) ---
// kaa (qoraqalpoq lotin): shubhali atamalar "// kaa: tekshirilsin" bilan belgilangan.
export const G = {
  answer: { uz: 'Javob', ru: 'Ответ', kaa: 'Juwap', en: 'Answer' },
  equation: { uz: 'tenglama', ru: 'уравнение', kaa: 'teńleme', en: 'equation' },
  inequality: { uz: 'tengsizlik', ru: 'неравенство', kaa: 'teńsizlik', en: 'inequality' },
  root: { uz: 'ildiz', ru: 'корень', kaa: 'túbir', en: 'root' },
  integerSolutions: { uz: 'butun yechimlar', ru: 'целые решения', kaa: 'pútin sheshimler', en: 'integer solutions' }, // kaa: tekshirilsin
  domain: { uz: 'aniqlanish sohasi', ru: 'область определения', kaa: 'anıqlanıw oblastı', en: 'domain' }, // kaa: tekshirilsin
  function: { uz: 'funksiya', ru: 'функция', kaa: 'funkciya', en: 'function' },
  graph: { uz: 'grafik', ru: 'график', kaa: 'grafik', en: 'graph' },
  vertex: { uz: 'uch', ru: 'вершина', kaa: 'ushı', en: 'vertex' }, // kaa: tekshirilsin
  discriminant: { uz: 'diskriminant', ru: 'дискриминант', kaa: 'diskriminant', en: 'discriminant' },
  parameter: { uz: 'parametr', ru: 'параметр', kaa: 'parametr', en: 'parameter' },
  current: { uz: 'oqim', ru: 'течение', kaa: 'aǵıs', en: 'current' }, // kaa: tekshirilsin
  solution: { uz: 'eritma', ru: 'раствор', kaa: 'eritpe', en: 'solution' }, // kaa: tekshirilsin
  odz: { uz: 'aniqlanish sohasi (maxraj nolga teng emas)', ru: 'ОДЗ (знаменатель не равен нулю)', kaa: 'anıqlanıw oblastı (bólshek bólimi nolge teń emes)', en: 'domain (the denominator is not zero)' }, // kaa: tekshirilsin
} satisfies Record<string, L10n>;

export const H = {
  /** javob kasr bo'lishi mumkin */
  number: {
    uz: "Javobni butun son, oddiy kasr (masalan 3/4) yoki o'nli kasr (masalan 0.75) ko'rinishida yozing.",
    ru: 'Запишите ответ целым числом, обыкновенной дробью (например, 3/4) или десятичной дробью (например, 0.75).',
    kaa: "Juwaptı pútin san, ápiwayı bólshek (mısalı 3/4) yamasa onlıq bólshek (mısalı 0.75) kórinisinde jazıń.", // kaa: tekshirilsin
    en: 'Write the answer as an integer, a common fraction (e.g. 3/4) or a decimal (e.g. 0.75).',
  },
  integer: {
    uz: 'Javob butun son.',
    ru: 'Ответ — целое число.',
    kaa: 'Juwap pútin san.',
    en: 'The answer is an integer.',
  },
} satisfies Record<string, L10n>;

// --- TeX yordamchilari ---

/** Ko'phad: koeffitsiyentlar yuqori darajadan boshlab. texPoly([1,-5,6]) = "x^{2} - 5x + 6" */
export function texPoly(c: readonly number[], v = 'x'): string {
  const deg = c.length - 1;
  let out = '';
  c.forEach((co, i) => {
    if (co === 0) return;
    const p = deg - i;
    const abs = Math.abs(co);
    const body = p === 0 ? String(abs) : `${abs === 1 ? '' : abs}${v}${p === 1 ? '' : `^{${p}}`}`;
    out += out === '' ? (co < 0 ? '-' : '') + body : (co < 0 ? ' - ' : ' + ') + body;
  });
  return out || '0';
}

/** x + a / x - a ko'rinishidagi ikkihad */
export const texLin = (v: string, a: number): string => (a === 0 ? v : a > 0 ? `${v} + ${a}` : `${v} - ${-a}`);

/** Kasr yoki manfiy sonni darajaga ko'tarish/ko'paytirish uchun qavsga oladi */
export const fp = (f: Frac): string => (f.d !== 1 || f.n < 0 ? `\\left(${texFrac(f)}\\right)` : String(f.n));

/** k*pi/d ko'rinishidagi son (k/d pi): texPi(frac(5,6)) = \frac{5\pi}{6} */
export function texPi(f: Frac): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const n = Math.abs(f.n);
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return f.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${f.d}}`;
}

export const fv = (f: Frac): number => f.n / f.d;

export const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// --- Variant bo'yicha parametr tanlash ---

/** Ro'yxatni shablonga xos tartibda aralashtirib, variant raqami bo'yicha element tanlaydi: turli variantlarda turli parametr. */
export function pickPool<T>(req: SlotRequest, id: string, items: readonly T[]): T {
  if (items.length < 6) throw new Error(`${id}: parametrlar ro'yxati kamida 6 ta bo'lishi kerak`);
  return makeRng(`pool|${id}`).shuffle(items)[req.variant % items.length]!;
}

// --- Chalg'ituvchi variantlar ---

export interface Choices {
  correct: string;
  wrong: string[];
}

/** Kasr/butun javob uchun variantlar: avval tipik xatolar, yetmasa +-butun qadamlar. Butun javobga faqat butun chalg'ituvchilar. */
export function fracChoices(correct: Frac, mistakes: readonly Frac[]): Choices {
  const fmt = (f: Frac) => M(texFrac(f));
  const seen = new Set<string>([fmt(correct)]);
  const wrong: string[] = [];
  const intOnly = correct.d === 1;
  const push = (f: Frac) => {
    if (!Number.isFinite(f.n) || !Number.isFinite(f.d)) return;
    if (intOnly && f.d !== 1) return;
    const s = fmt(f);
    if (!seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
  };
  mistakes.forEach(push);
  for (let step = 1; wrong.length < 4 && step < 40; step++) {
    push(fAdd(correct, frac(step)));
    push(fSub(correct, frac(step)));
  }
  return { correct: fmt(correct), wrong };
}

export const intChoices = (correct: number, mistakes: readonly number[]): Choices => fracChoices(frac(correct), mistakes.map((m) => frac(m)));

/** Matnli variantlar (masalan pi ning ulushlari): tayyor satrlar */
export function textChoices(correct: string, mistakes: readonly string[]): Choices {
  const seen = new Set<string>([correct]);
  const wrong: string[] = [];
  for (const m of mistakes) {
    if (!seen.has(m)) {
      seen.add(m);
      wrong.push(m);
    }
  }
  return { correct, wrong };
}

// --- Shablon tuzilmalari ---

export interface DraftY1 extends Choices {
  /** to'g'ri javobning sonli qiymati (mustaqil tekshiruv uchun) */
  value: number;
  est: number;
  stem: (l: Lang) => string;
  solution: (l: Lang) => string;
  mistake: (l: Lang) => string;
  params: unknown;
}

export interface Y1Entry {
  id: string;
  topic: number;
  extraTopics?: number[];
  run(req: SlotRequest): DraftY1;
}

interface Y1Def<P> {
  id: string;
  topic: number;
  extraTopics?: number[];
  draw: (req: SlotRequest, rng: Rng) => P;
  build: (p: P) => Omit<DraftY1, 'params'>;
}

export function y1Entry<P>(def: Y1Def<P>): Y1Entry {
  return {
    id: def.id,
    topic: def.topic,
    extraTopics: def.extraTopics,
    run(req) {
      const p = def.draw(req, slotRng(req, def.id));
      return { ...def.build(p), params: p };
    },
  };
}

export function y1Spec(req: SlotRequest, entry: Y1Entry): QuestionSpec {
  const d = entry.run(req);
  // harflar tartibi content() dan TASHQARIDA aralashtiriladi: barcha tillarda bir xil
  const built = y1Options(d.correct, d.wrong, slotRng(req, 'options'));
  return {
    topic: entry.topic,
    extraTopics: entry.extraTopics,
    difficulty: req.difficulty,
    estSeconds: d.est,
    key: { correct: built.correct },
    content: (lang) => ({
      stem_md: d.stem(lang),
      payload: { options: built.options },
      solution_md: d.solution(lang),
      mistake_note_md: d.mistake(lang),
    }),
  };
}

export interface OPartDraft {
  /** sonli qiymat (mustaqil tekshiruv uchun) */
  value: number;
  /** qabul qilinadigan shakllar */
  forms: string[];
  prompt: (l: Lang) => string;
  hint?: (l: Lang) => string;
}

export interface DraftO {
  est: number;
  stem: (l: Lang) => string;
  parts: { a?: OPartDraft; b?: OPartDraft };
  solution: (l: Lang) => string;
  mistake: (l: Lang) => string;
  params: unknown;
}

export interface OEntry {
  id: string;
  topic: number;
  extraTopics?: number[];
  run(req: SlotRequest): DraftO;
}

interface ODef<P> {
  id: string;
  topic: number;
  extraTopics?: number[];
  draw: (req: SlotRequest, rng: Rng) => P;
  build: (p: P) => Omit<DraftO, 'params'>;
}

export function oEntry<P>(def: ODef<P>): OEntry {
  return {
    id: def.id,
    topic: def.topic,
    extraTopics: def.extraTopics,
    run(req) {
      const p = def.draw(req, slotRng(req, def.id));
      return { ...def.build(p), params: p };
    },
  };
}

/** Frac javobli ochiq band */
export function fracPart(f: Frac, prompt: (l: Lang) => string, withHint: boolean): OPartDraft {
  return { value: fv(f), forms: keyForms(f), prompt, hint: withHint ? pick(H.number) : undefined };
}

export function oSpec(req: SlotRequest, entry: OEntry): QuestionSpec {
  const d = entry.run(req);
  const key: { a?: string[]; b?: string[] } = {};
  if (d.parts.a) key.a = d.parts.a.forms;
  if (d.parts.b) key.b = d.parts.b.forms;
  return {
    topic: entry.topic,
    extraTopics: entry.extraTopics,
    difficulty: req.difficulty,
    estSeconds: d.est,
    key,
    content: (lang) => {
      const parts: Record<string, { prompt_md: string; hint?: string }> = {};
      for (const k of ['a', 'b'] as const) {
        const p = d.parts[k];
        if (!p) continue;
        parts[k] = p.hint ? { prompt_md: p.prompt(lang), hint: p.hint(lang) } : { prompt_md: p.prompt(lang) };
      }
      return { stem_md: d.stem(lang), payload: { parts }, solution_md: d.solution(lang), mistake_note_md: d.mistake(lang) };
    },
  };
}

/** Shablonni (variant, index) bo'yicha aylantirib tanlaydi: bir variantda takrorlanmaydi (N >= count bo'lsa). */
export function chooseEntry<T>(entries: readonly T[], req: SlotRequest): T {
  return entries[(req.variant * req.count + req.index) % entries.length]!;
}
